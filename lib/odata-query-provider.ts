import {
    ExpressionType, Expression,
    LiteralExpression, VariableExpression, UnaryExpression,
    GroupExpression, AssignExpression, ObjectExpression, ArrayExpression,
    BinaryExpression, MemberExpression, IndexerExpression, FuncExpression,
    CallExpression, TernaryExpression
} from 'jokenizer';
import { IQueryPart, IRequestProvider, QueryFunc, AjaxFuncs, AjaxOptions, IQueryProvider, QueryParameter } from "jinqu";
import { ODataQuery, ODataFuncs } from './odata-query';

const orderFuncs = [QueryFunc.orderBy, QueryFunc.orderByDescending];
const thenFuncs = [QueryFunc.thenBy, QueryFunc.thenByDescending];
const otherFuncs = [QueryFunc.inlineCount, QueryFunc.where, QueryFunc.select, QueryFunc.skip, QueryFunc.take];
const mathFuncs = ['round', 'floor', 'ceiling'];

export class ODataQueryProvider implements IQueryProvider {

    constructor(protected requestProvider: IRequestProvider<AjaxOptions>) {
    }

    private rootLambda = true;

    createQuery<T>(parts?: IQueryPart[]): ODataQuery<T> {
        return new ODataQuery<T>(this, parts);
    }

    execute<T = any, TResult = PromiseLike<T[]>>(parts: IQueryPart[]): TResult {
        throw new Error('Synchronous execution is not supported');
    }

    executeAsync<T = any, TResult = T[]>(parts: IQueryPart[]): PromiseLike<TResult> {
        const options: AjaxOptions[] = [];
        const params: IQueryPart[] = [];
        const queryParams: QueryParameter[] = [];

        let orders: IQueryPart[] = [],
            expands: IQueryPart[] = [];

        for (let part of parts) {
            if (part.type === AjaxFuncs.options) {
                options.push(part.args[0].literal);
            }
            else if (part.type === QueryFunc.toArray || part.type === QueryFunc.first) continue;
            else if (~orderFuncs.indexOf(part.type)) {
                orders = [part];
            }
            else if (~thenFuncs.indexOf(part.type)) {
                orders.push(part);
            }
            else if (part.type === ODataFuncs.expand) {
                expands.push(part);
            }
        }

        return this.requestProvider.request<TResult>(queryParams, options);
    }

    handlePart(part: IQueryPart): QueryParameter {
        const args = part.args.map(a =>
            a.literal != null || a.exp == null
                ? a.literal
                : this.expToStr(a.exp, a.scopes, a.exp.type === ExpressionType.Func ? (a.exp as FuncExpression).parameters : [])
        ).join(';');
        return { key: '$' + part.type, value: args };
    }
    
    expToStr(exp: Expression, scopes: any[], parameters: string[]): string {
        switch (exp.type) {
            case ExpressionType.Literal:
                return this.literalToStr(exp as LiteralExpression);
            case ExpressionType.Variable:
                return this.variableToStr(exp as VariableExpression, scopes, parameters);
            case ExpressionType.Unary:
                return this.unaryToStr(exp as UnaryExpression, scopes, parameters);
            case ExpressionType.Group:
                return this.groupToStr(exp as GroupExpression, scopes, parameters);
            case ExpressionType.Object:
                return this.objectToStr(exp as ObjectExpression, scopes, parameters);
            case ExpressionType.Array:
                return this.arrayToStr(exp as ArrayExpression, scopes, parameters);
            case ExpressionType.Binary:
                return this.binaryToStr(exp as BinaryExpression, scopes, parameters);
            case ExpressionType.Member:
                return this.memberToStr(exp as MemberExpression, scopes, parameters);
            case ExpressionType.Indexer:
                return this.indexerToStr(exp as IndexerExpression, scopes, parameters);
            case ExpressionType.Func:
                return this.funcToStr(exp as FuncExpression, scopes, parameters);
            case ExpressionType.Call:
                return this.callToStr(exp as CallExpression, scopes, parameters);
            case ExpressionType.Ternary:
                return this.ternaryToStr(exp as TernaryExpression, scopes, parameters);
            default:
                throw new Error(`Unsupported expression type ${exp.type}`);
        }
    }

    literalToStr(exp: LiteralExpression) {
        return this.valueToStr(exp.value);
    }

    variableToStr(exp: VariableExpression, scopes: any[], parameters: string[]) {
        const name = exp.name;
        if (~parameters.indexOf(name)) return '';

        const s = scopes && scopes.find(s => name in s);
        return (s && this.valueToStr(s[name])) || name;
    }

    unaryToStr(exp: UnaryExpression, scopes: any[], parameters: string[]) {
        return `${getUnaryOp(exp.operator)}${this.expToStr(exp.target, scopes, parameters)}`;
    }

    groupToStr(exp: GroupExpression, scopes: any[], parameters: string[]) {
        return `(${exp.expressions.map(e => this.expToStr(e, scopes, parameters)).join(', ')})`;
    }

    objectToStr(exp: ObjectExpression, scopes: any[], parameters: string[]) {
        return exp.members.map(m => {
            const ae = m as AssignExpression;
            return `${ae.name} as ${this.expToStr(ae.right, scopes, parameters)}`;
        }).join(', ');
    }

    arrayToStr(exp: ArrayExpression, scopes: any[], parameters: string[]) {
        return `new[] {${exp.items.map(e => this.expToStr(e, scopes, parameters)).join(', ')}}`;
    }

    binaryToStr(exp: BinaryExpression, scopes: any[], parameters: string[]) {
        const left = this.expToStr(exp.left, scopes, parameters);
        const op = getBinaryOp(exp.operator);
        const right = this.expToStr(exp.right, scopes, parameters);

        return `${left} ${op} ${right}`;
    }

    memberToStr(exp: MemberExpression, scopes: any[], parameters: string[]) {
        const owner = this.expToStr(exp.owner, scopes, parameters);
        if (exp.name === 'length')
            return `length(${owner})`;

        return owner ? `${owner}/${exp.name}` : exp.name;
    }

    indexerToStr(exp: IndexerExpression, scopes: any[], parameters: string[]) {
        return `${this.expToStr(exp.owner, scopes, parameters)}[${this.expToStr(exp.key, scopes, parameters)}]`;
    }

    funcToStr(exp: FuncExpression, scopes: any[], parameters: string[]) {
        const rl = this.rootLambda;
        this.rootLambda = false;
        const prm = rl ? '' : (exp.parameters.join(', ') + ': ');
        const body = this.expToStr(exp.body, scopes, parameters);
        return prm + body;
    }

    callToStr(exp: CallExpression, scopes: any[], parameters: string[]) {
        const callee = exp.callee as VariableExpression;
        if (callee.type !== ExpressionType.Member && callee.type !== ExpressionType.Variable)
            throw new Error(`Invalid function call ${this.expToStr(exp.callee, scopes, parameters)}`);

        let args = exp.args.map(a => this.expToStr(a, scopes, parameters)).join(', ');
        if (callee.type === ExpressionType.Member) {
            const member = callee as MemberExpression;
            const ownerStr = this.expToStr(member.owner, scopes, parameters);

            // handle Math functions
            if (~mathFuncs.indexOf(callee.name) && ownerStr === 'Math')
                return `${callee.name}(${args})`;
            // substringof is the only function where owner is the second parameter
            if (callee.name === 'includes')
                return `substringof(${args}, ${ownerStr})`;
            // any and all are the only functions which can be called on owner
            if (callee.name === 'any' || callee.name === 'all')
                return `${ownerStr}/${callee.name}(${args})`;

            // other supported functions takes owner as the first argument`
            args = args ? `${ownerStr}, ${args}` : ownerStr;
        }

        const oDataFunc = functions[callee.name] || callee.name;
        return `${oDataFunc}(${args})`;
    }

    ternaryToStr(exp: TernaryExpression, scopes: any[], parameters: string[]) {
        const predicate = this.expToStr(exp.predicate, scopes, parameters);
        const whenTrue = this.expToStr(exp.whenTrue, scopes, parameters);
        const whenFalse = this.expToStr(exp.whenFalse, scopes, parameters);

        return `${predicate} ? ${whenTrue} : ${whenFalse}`;
    }

    valueToStr(value) {
        if (Object.prototype.toString.call(value) === '[object Date]')
            return `"datetime'${value.toISOString()}'"`;

        if (value == null)
            return 'null';
        if (typeof value === 'string')
            return `"${value.replace(/"/g, '""')}"`;
        if (Object.prototype.toString.call(value) === '[object Date]')
            return `"${value.toISOString()}"`;

        return value;
    }
}

function getBinaryOp(op: string) {
    switch (op) {
        case '==': case '===': return 'eq';
        case '!=': case '!==': return 'ne';
        case '>': return 'gt';
        case '>=': return 'ge';
        case '<': return 'lt';
        case '>=': return 'le';
        case '+': return 'add';
        case '-': return 'sub';
        case '*': return 'mul';
        case '/': return 'div';
        case '%': return 'mod';
        case '&&': return 'and';
        case '||': return 'or';
        default: return op;
    }
}

function getUnaryOp(op) {
    if (op === '!') return 'not';

    return op;
}

const functions = {
    'endsWith': 'endswith',
    'startsWith': 'startswith',
    'indexOf': 'indexof',
    'replace': 'replace',
    'substr': 'substring',
    'toLowerCase': 'tolower',
    'toUpperCase': 'toupper',
    'trim': 'trim',
    'concat': 'concat',
    'getDate': 'day',
    'getHours': 'hour',
    'getMinutes': 'minute',
    'getMonth': 'month',
    'getSeconds': 'second',
    'getFullYear': 'year'
};
