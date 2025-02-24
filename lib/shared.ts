import {
    AjaxFuncs, Ctor, IPartArgument,
    IQueryPart, QueryFunc, QueryParameter,
} from "@jin-qu/jinqu";
import {
    ArrayExpression, BinaryExpression, CallExpression,
    Expression, ExpressionType, FuncExpression,
    GroupExpression, LiteralExpression, MemberExpression,
    ObjectExpression, UnaryExpression, VariableExpression,
} from "jokenizer";
import { ODataOptions } from "./odata-query-provider";

export const ODataFuncs = {
    action: "action",
    apply: "apply",
    byKey: "byKey",
    expand: "expand",
    filter: "filter",
    function: "function",
    funcParams: "funcParams",
    navigateTo: "navigateTo",
    oDataSelect: "oDataSelect",
    setData: "setData",
    thenExpand: "thenExpand",
    top: "top",
    update: "update",
    insert: "insert",
};

const orderFuncs = [QueryFunc.orderBy, QueryFunc.orderByDescending];
const thenFuncs = [QueryFunc.thenBy, QueryFunc.thenByDescending];
const descFuncs = [QueryFunc.orderByDescending, QueryFunc.thenByDescending];
const otherFuncs = [QueryFunc.inlineCount, QueryFunc.skip, QueryFunc.count, ODataFuncs.top];
const mathFuncs = ["round", "floor", "ceiling"];
const aggregateFuncs = ["sum", "max", "min"];
const functions = {
    getDate: "day",
    getDatePart: "date",
    getFullYear: "year",
    getHours: "hour",
    getMinutes: "minute",
    getMonth: "month",
    getSeconds: "second",
    getTimePart: "time",
    includes: "contains",
    substr: "substring",
    toLowerCase: "tolower",
    toUpperCase: "toupper",
};

interface ExpandContainer { select?: string; filter?: string; children: ExpandCollection; }
interface ExpandCollection { [expand: string]: ExpandContainer; }

let rootLambda: boolean;

export function handleParts<TOptions extends ODataOptions>(parts: IQueryPart[]): [QueryParameter[], TOptions[], Ctor<unknown>] {
    rootLambda = true;

    const options: TOptions[] = [];
    const params = {};
    const queryParams: QueryParameter[] = [];
    const expands: IQueryPart[] = [];
    const filters: IQueryPart[] = [];
    let data: IQueryPart;
    let byKey: IQueryPart;
    let actOrFunc: IQueryPart;
    let funcParams: IQueryPart;
    let navigateTo: IQueryPart;
    let inlineCount = false;
    let includeResponse = false;
    let orders: IQueryPart[] = [];
    let select: IQueryPart;
    let apply: IQueryPart;
    let ctor: Ctor<any>;
    let updateMethod: string;
    let update = false;
    let insert = false;
    let returnRepresentation = false;

    function quoteIfString(val: any): string {
        return (typeof val === "string") ? "'" + val + "'" : String(val);
    }

    for (const part of parts) {
        if (part.type === AjaxFuncs.options) {
            const o = part.args[0].literal as TOptions;
            options.push(o);
            if (o.$updateMethod) {
                updateMethod = o.$updateMethod;
            }
        } else if (part.type === QueryFunc.cast) {
            ctor = part.args[0].literal as any;
        } else if (part.type === QueryFunc.toArray
            || part.type === QueryFunc.first
            || part.type === QueryFunc.single) {
            // ignored
        } else if (part.type === QueryFunc.inlineCount) {
            inlineCount = true;
        } else if (part.type === AjaxFuncs.includeResponse) {
            includeResponse = true;
        } else if (part.type === ODataFuncs.byKey) {
            byKey = part;
        } else if (part.type === ODataFuncs.navigateTo) {
            navigateTo = part;
        } else if (part.type === ODataFuncs.action || part.type === ODataFuncs.function) {
            actOrFunc = part;
        } else if (part.type === ODataFuncs.funcParams) {
            funcParams = part;
        } else if (part.type === ODataFuncs.oDataSelect) {
            select = part;
        } else if (part.type === ODataFuncs.expand || part.type === ODataFuncs.thenExpand) {
            expands.push(part);
        } else if (part.type === ODataFuncs.apply) {
            ctor = null;
            apply = part;
        } else if (part.type === ODataFuncs.setData) {
            data = part;
        } else if (orderFuncs.indexOf(part.type) !== -1) {
            orders = [part];
        } else if (thenFuncs.indexOf(part.type) !== -1) {
            orders.push(part);
        } else if (part.type === ODataFuncs.filter) {
            filters.push(part);
        } else if (otherFuncs.indexOf(part.type) !== -1) {
            params[part.type] = part.args[0];
        } else if (part.type === ODataFuncs.update) {
            update = true;
            returnRepresentation = part.args[0].literal === true;
        } else if (part.type === ODataFuncs.insert) {
            insert = true;
            returnRepresentation = part.args[0].literal === true;
        } else
            throw new Error(`${part.type} is not supported.`);
    }

    if (byKey) {
        let keyVal: string = null;
        let argVal = byKey.args[0].literal;
        if (argVal) {
            if (typeof argVal === "object") {
                if (Object.keys(argVal).length > 1) {
                    keyVal = Object.keys(argVal).map((key: string) => `${key}=${quoteIfString(argVal[key])}`).join(",");
                } else
                    throw new Error("Composite key must have at least two properties.");
            } else {
                keyVal = quoteIfString(argVal);
            }
        }

        queryParams.push({ key: ODataFuncs.byKey, value: keyVal });
    }

    if (navigateTo) {
        const v = handlePartArg(navigateTo.args[0]);
        queryParams.push({ key: ODataFuncs.navigateTo, value: v });
    }

    if (actOrFunc) {
        const v = actOrFunc.args[0].literal as string;
        queryParams.push({ key: actOrFunc.type, value: v });
    }

    if (funcParams) {
        let parVal: string = null;
        const argVal = funcParams.args[0].literal;
        if (argVal) {
            if (typeof argVal === "object") {
                if (Object.keys(argVal).length > 0) {
                    parVal = Object.keys(argVal).map((key: string) => `${key}=${quoteIfString(argVal[key])}`).join(",");
                } else
                    throw new Error("Function parameters must have at least one property.");
            } else {
                parVal = quoteIfString(argVal);
            }
        }

        queryParams.push({ key: ODataFuncs.funcParams, value: parVal });
    }

    if (orders.length) {
        const value = orders.map(o => {
            const v = handlePartArg(o.args[0]);
            return descFuncs.indexOf(o.type) !== -1 ? (v + " desc") : v;
        }).join(",");
        queryParams.push({ key: "$orderby", value });
    }

    if (select) {
        const l = select.args[0].literal as string[];
        queryParams.push({ key: "$select", value: l.join(",") });
    }

    if (expands.length) {
        const es: ExpandCollection = {};
        let ce: ExpandContainer;
        expands.forEach(e => {
            const exp = e.args[0].literal as string;
            const sel = e.args[1].literal as string;
            const fil = handlePartArg(e.args[2]);

            let col: ExpandCollection;
            if (e.type === ODataFuncs.expand) {
                col = es;
            } else {
                if (!ce) {
                    throw new Error("'thenExpand' must be called after an 'expand'.");
                }

                col = ce.children;
            }

            ce = col[exp] || (col[exp] = { children: {} });
            ce.select = sel;
            ce.filter = fil;
        });

        queryParams.push({ key: "$expand", value: walkExpands(es) });
    }

    if (inlineCount) {
        queryParams.push({ key: QueryFunc.inlineCount, value: "" });
    }

    if (includeResponse) {
        queryParams.push({ key: AjaxFuncs.includeResponse, value: "" });
    }

    if (filters.length) {
        const value = filters.map((o) => {
            return handlePartArg(o.args[0]);
        }).join(" and ");
        queryParams.push({ key: "$filter", value });
    }

    for (const p in params) {
        if (Object.prototype.hasOwnProperty.call(params, p)) {
            queryParams.push({ key: "$" + p, value: handlePartArg(params[p]) });
        }
    }

    if (apply) {
        const keySelector = handlePartArg(apply.args[0]);
        const valueSelector = apply.args[1] && handlePartArg(apply.args[1]);
        if (valueSelector) {
            queryParams.push({ key: "$apply", value: `groupby((${keySelector}),aggregate(${valueSelector}))` });
        } else {
            queryParams.push({ key: "$apply", value: `groupby((${keySelector}))` });
        }
    }

    if (data) {
        options.push({ $data: data.args[0].literal } as TOptions);
    }

    if (update || insert) {
        const o: any = returnRepresentation ? { $headers: { prefer: "return=representation" } } : {};
        o.$method = update ? (updateMethod ?? "PATCH") : "POST";
        options.push(o);
    }

    return [queryParams, options, ctor];
}

function handlePartArg(arg: IPartArgument): string {
    return arg.literal != null || arg.exp == null
        ? arg.literal as string
        : handleExp(arg.exp, arg.scopes);
}

function handleExp(exp: Expression, scopes: any[]) {
    const rl = rootLambda;
    rootLambda = true;
    const parameters = exp.type === ExpressionType.Func ? (exp as FuncExpression).parameters : [];
    const retVal = expToStr(exp, scopes, parameters);
    rootLambda = rl;
    return retVal;
}

function expToStr(exp: Expression, scopes: any[], parameters: string[]): string {
    switch (exp.type) {
        case ExpressionType.Literal:
            return literalToStr(exp as LiteralExpression);
        case ExpressionType.Variable:
            return variableToStr(exp as VariableExpression, scopes, parameters);
        case ExpressionType.Unary:
            return unaryToStr(exp as UnaryExpression, scopes, parameters);
        case ExpressionType.Group:
            // little hack to workaround object grouping
            // "c => ({ id: c.id })" expression generates "(id)" and OData does not support that
            // but, we have to use that syntax to use ObjectExpression with lambdas
            // so, we unwrap groups if they contain only one ObjectExpression
            // eslint-disable-next-line no-case-declarations
            const groupExp = exp as GroupExpression;
            return groupExp.expressions.length === 1 && groupExp.expressions[0].type === ExpressionType.Object
                ? expToStr(groupExp.expressions[0], scopes, parameters)
                : groupToStr(groupExp, scopes, parameters);
        case ExpressionType.Object:
            return objectToStr(exp as ObjectExpression, scopes, parameters);
        case ExpressionType.Binary:
            return binaryToStr(exp as BinaryExpression, scopes, parameters);
        case ExpressionType.Member:
            return memberToStr(exp as MemberExpression, scopes, parameters);
        case ExpressionType.Func:
            return funcToStr(exp as FuncExpression, scopes, parameters);
        case ExpressionType.Call:
            return callToStr(exp as CallExpression, scopes, parameters);
        case ExpressionType.Array:
            return arrayToStr(exp as ArrayExpression, scopes, parameters);
        default:
            throw new Error(`Unsupported expression type ${exp.type}`);
    }
}

function literalToStr(exp: LiteralExpression) {
    return valueToStr(exp.value);
}

function variableToStr(exp: VariableExpression, scopes: any[], parameters: string[]) {
    const name = exp.name;
    if (parameters.indexOf(name) !== -1)
        return "";

    const scope = scopes && scopes.find(s => name in s);
    return (scope && valueToStr(scope[name])) || name;
}

function unaryToStr(exp: UnaryExpression, scopes: any[], parameters: string[]) {
    return `${getUnaryOp(exp.operator)}${expToStr(exp.target, scopes, parameters)}`;
}

function groupToStr(exp: GroupExpression, scopes: any[], parameters: string[]) {
    return `(${exp.expressions.map(e => expToStr(e, scopes, parameters)).join(",")})`;
}

function objectToStr(exp: ObjectExpression, scopes: any[], parameters: string[]) {
    return exp.members.map(m => {
        const e = expToStr(m.right, scopes, parameters);
        return e === m.name ? e : `${e} as ${m.name}`;
    }).join(",");
}

function binaryToStr(exp: BinaryExpression, scopes: any[], parameters: string[]) {
    const left = expToStr(exp.left, scopes, parameters);
    const op = getBinaryOp(exp.operator);
    const right = expToStr(exp.right, scopes, parameters);

    return `${left} ${op} ${right}`;
}

function memberToStr(exp: MemberExpression, scopes: any[], parameters: string[]) {
    const owner = expToStr(exp.owner, scopes, parameters);

    if (!owner)
        return exp.name;

    if (typeof owner === "object")
        return valueToStr(owner![exp.name]);

    if (exp.name === "length")
        return `length(${owner})`;

    return `${owner}/${exp.name}`;
}

function funcToStr(exp: FuncExpression, scopes: any[], parameters: string[]) {
    const rl = rootLambda;
    rootLambda = false;
    const prm = rl ? "" : (exp.parameters.join(",") + ": ");
    const body = expToStr(exp.body, scopes, parameters);
    return prm + body;
}

function callToStr(exp: CallExpression, scopes: any[], parameters: string[]) {
    const callee = exp.callee as MemberExpression;
    if (callee.type !== ExpressionType.Member) {
        if (callee.type === ExpressionType.Variable) {
            // handle Date literal
            if (callee.name === "Date" && exp.args[0].type === ExpressionType.Literal) {
                return (exp.args[0] as LiteralExpression).value;
            }
        }
        throw new Error(`Invalid function call ${expToStr(exp.callee, scopes, parameters)}`);
    }

    let args: string;
    const ownerStr = expToStr(callee.owner, scopes, parameters);

    if (callee.name === "count")
        return ownerStr ? `${ownerStr}/$count` : "$count";

    if (aggregateFuncs.indexOf(callee.name) !== -1)
        return `${handleExp(exp.args[0], scopes)} with ${callee.name}`;

    if (callee.owner.type === ExpressionType.Array && callee.name === 'includes')
        return `${expToStr(exp.args[0], scopes, parameters)} in (${ownerStr})`;

    args = exp.args.map(a => expToStr(a, scopes, parameters)).join(",");

    // handle Math functions
    if (mathFuncs.indexOf(callee.name) !== -1 && ownerStr === "Math")
        return `${callee.name}(${args})`;
    // any and all are the only functions which can be called on owner
    if (callee.name === "any" || callee.name === "all")
        return `${ownerStr}/${callee.name}(${args})`;

    // other supported functions takes owner as the first argument
    args = args ? `${ownerStr},${args}` : ownerStr;

    const oDataFunc = functions[callee.name] || callee.name.toLowerCase();
    return `${oDataFunc}(${args})`;
}

function arrayToStr(exp: ArrayExpression, scopes: any[], parameters: string[]) {
    // exclude nulls
    return exp.items.reduce((result, m) => {
        if (m) {
            result.push(expToStr(m, scopes, parameters));
        }
        return result;
    }, []).join(",");
}

function valueToStr(value: any) {
    if (Object.prototype.toString.call(value) === "[object Date]")
        return `${value.toISOString()}`;

    if (value == null)
        return "null";

    if (typeof value === "string")
        return `'${value.replace(/'/g, "''")}'`;

    if (typeof value === "number")
        return value.toString();

    if (typeof value === "boolean")
        return value.toString();

    return value;
}

function walkExpands(e: ExpandCollection) {
    const expStrs = [];
    for (const p in e) {
        const exp = e[p];
        const childStr = walkExpands(exp.children);

        const subStrs = [];
        if (exp.filter) {
            subStrs.push(`$filter=${exp.filter}`);
        }
        if (exp.select) {
            subStrs.push(`$select=${exp.select}`);
        }
        if (childStr) {
            subStrs.push(`$expand=${childStr}`);
        }

        const expStr = subStrs.length
            ? `${p}(${subStrs.join(";")})`
            : p;
        expStrs.push(expStr);
    }

    return expStrs.join(",");
}

function getBinaryOp(op: string) {
    switch (op) {
        case "==":
        case "===": return "eq";
        case "!=":
        case "!==": return "ne";
        case ">": return "gt";
        case ">=": return "ge";
        case "<": return "lt";
        case "<=": return "le";
        case "+": return "add";
        case "-": return "sub";
        case "*": return "mul";
        case "/": return "div";
        case "%": return "mod";
        case "&&": return "and";
        case "||": return "or";
        default: return op;
    }
}

function getUnaryOp(op: string) {
    return op === "!" ? "not " : op;
}
