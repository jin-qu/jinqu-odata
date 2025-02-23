import {
    AjaxFuncs, AjaxResponse, Ctor, Func1,
    IQueryBase, IQueryPart, IQueryProvider,
    PartArgument, Predicate, QueryPart, Result,
} from "jinqu";
import { InlineCountInfo } from "jinqu";
import { handleParts, ODataFuncs } from "./shared";
import { ODataOptions } from "./odata-query-provider";

export type SingleKey = string | number | bigint | boolean | null;
export type CompositeKey<T> = { [P in
    ({ [K in keyof T]: T[K] extends object ? never : K }[keyof T])
]?: T[P] };

export class ODataQuery<
    T extends object,
    TOptions extends ODataOptions = ODataOptions,
    TResponse = any, TExtra = {}>
    implements IODataQuery<T, TOptions, TResponse, TExtra> {

    constructor(public readonly provider: IQueryProvider, public readonly parts: IQueryPart[] = []) {
    }

    public withOptions(options: TOptions): ODataQuery<T, TOptions, TResponse, TExtra> {
        return this.create(QueryPart.create(AjaxFuncs.options, [PartArgument.literal(options)])) as any;
    }

    public setParameter(key: string, value: unknown): ODataQuery<T, TOptions, TResponse, TExtra> {
        return this.withOptions({ $params: [{ key, value: String(value) }] } as any);
    }

    public includeResponse(): ODataQuery<T, TOptions, TResponse, TExtra & AjaxResponse<TResponse>> {
        const part = new QueryPart(AjaxFuncs.includeResponse, []);
        return this.create(part) as any;
    }

    public setData(value: unknown): IODataQuery<T, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.setData, [PartArgument.literal(value)]);
        return this.create(part);
    }

    public byKey(key: SingleKey | CompositeKey<T>): IODataQuery<T, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.byKey, [PartArgument.literal(key)]);
        return this.create(part);
    }

    public action(name: string): IODataQuery<T, TOptions, TResponse, TExtra> {
        const part1 = new QueryPart(ODataFuncs.action, [PartArgument.literal(name)]);
        const options: ODataOptions = {
            $method: "POST"
        };
        const part2 = new QueryPart(AjaxFuncs.options, [PartArgument.literal(options)]);
        return this.create(part1, part2);
    }

    public function(name: string): IFunctionODataQuery<T, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.function, [PartArgument.literal(name)]);
        return this.createFunctionQuery(part);
    }

    public navigateTo<TNav extends object>(keySelector: Func1<T, TNav>, ...scopes: unknown[]) {
        const part = new QueryPart(ODataFuncs.navigateTo, [PartArgument.identifier(keySelector, scopes)]);
        return this.createNavigatedQuery<AU<TNav>>(part);
    }

    public inlineCount() {
        return this.create<T, TExtra & InlineCountInfo>(QueryPart.inlineCount());
    }

    public where(predicate: Predicate<T>, ...scopes: unknown[]): IODataQuery<T, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.filter, [PartArgument.identifier(predicate, scopes)]);
        return this.create(part);
    }

    public orderBy(keySelector: Func1<T>, ...scopes: unknown[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra> {
        return this.createOrderedQuery(QueryPart.orderBy(keySelector, scopes));
    }

    public orderByDescending(keySelector: Func1<T>, ...scopes: unknown[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra> {
        return this.createOrderedQuery(QueryPart.orderByDescending(keySelector, scopes));
    }

    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes: unknown[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes: unknown[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        nav: K1, prm1?: K2[] | Predicate<AU<T[K1]>>, prm2?: Predicate<AU<T[K1]>>, ...scopes: unknown[])
            : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, ...scopes);
        return this.createExpandedQuery<AU<T[K1]>>(new QueryPart(ODataFuncs.expand, args));
    }

    public skip(count: number): IODataQuery<T, TOptions, TResponse, TExtra> {
        return this.create(QueryPart.skip(count));
    }

    public take(count: number): IODataQuery<T, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.top, [PartArgument.literal(count)]);
        return this.create(part);
    }

    public select<K extends keyof T>(...names: K[]): IODataQuery<Pick<T, K>, TOptions, TResponse, TExtra> {
        const part = new QueryPart(ODataFuncs.oDataSelect, [PartArgument.literal(names)]);
        return this.create(part);
    }

    public groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>,
        elementSelector?: Func1<T[] & TKey, TResult>,
        ...scopes: unknown[]): PromiseLike<Result<TResult[], TExtra>> {

        const args = [new PartArgument(keySelector, null, scopes)];
        if (elementSelector) {
            args.push(new PartArgument(elementSelector, null, scopes));
        }
        const part = new QueryPart(ODataFuncs.apply, args);
        return this.provider.executeAsync([...this.parts, part]) as any;
    }

    public count(predicate?: Predicate<T>, ...scopes: unknown[]): PromiseLike<Result<number, TExtra>> {
        return this.provider.executeAsync([...this.parts, QueryPart.count(predicate, scopes)]);
    }

    public cast(ctor: Ctor<T>): IODataQuery<T, TOptions, TResponse, TExtra> {
        return this.create(QueryPart.cast(ctor));
    }

    public toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>> {
        const query = ctor ? this.cast(ctor) : this;
        return query.provider.executeAsync([...query.parts, QueryPart.toArray()]);
    }

    public singleAsync(ctor?: Ctor<T>): PromiseLike<Result<T, TExtra>> {
        const query = ctor ? this.cast(ctor) : this;
        return query.provider.executeAsync([...query.parts, QueryPart.single()]);
    }

    public toString() {
        const [queryParams] = handleParts(this.parts);
        return queryParams.map(p => `${p.key}=${p.value}`).join("&");
    }

    protected create<TResult extends object = T, TNewExtra = TExtra>(...parts: IQueryPart[]) {
        return new ODataQuery<TResult, TOptions, TResponse, TNewExtra>(this.provider, [...this.parts, ...parts]);
    }

    protected createOrderedQuery(part: IQueryPart) {
        return new OrderedODataQuery<T, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    protected createExpandedQuery<TNav>(part: IQueryPart) {
        return new ExpandedODataQuery<T, TNav, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    protected createNavigatedQuery<TNav extends object>(part: IQueryPart) {
        return new ODataQuery<TNav, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    protected createFunctionQuery(part: IQueryPart) {
        return new FunctionODataQuery<T, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    public insertAsync(returnInserted?: boolean): PromiseLike<Result<T, TExtra>> {
        const part = new QueryPart(ODataFuncs.insert, [PartArgument.literal(returnInserted)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    public updateAsync(returnUpdated?: boolean): PromiseLike<Result<T, TExtra>> {
        const part = new QueryPart(ODataFuncs.update, [PartArgument.literal(returnUpdated)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    public deleteAsync(): PromiseLike<Result<void, TExtra>> {
        const options: ODataOptions = {
            $method: "DELETE"
        };
        const part = new QueryPart(AjaxFuncs.options, [PartArgument.literal(options)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    public executeAsync<TResult extends any = void>(): PromiseLike<Result<TResult, TExtra>> {
        return this.provider.executeAsync(this.parts);
    }
}

class OrderedODataQuery<T extends object, TOptions extends ODataOptions = ODataOptions, TResponse = any, TExtra = {}>
    extends ODataQuery<T, TOptions, TResponse, TExtra> implements IOrderedODataQuery<T, TOptions, TResponse, TExtra> {

    public thenBy(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra> {
        return this.createOrderedQuery(QueryPart.thenBy(keySelector, scopes));
    }

    public thenByDescending(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra> {
        return this.createOrderedQuery(QueryPart.thenByDescending(keySelector, scopes));
    }
}

class ExpandedODataQuery<
    TEntity extends object, TProperty,
    TOptions extends ODataOptions = ODataOptions,
    TResponse = any, TExtra = {}>
    extends ODataQuery<TEntity, TOptions, TResponse, TExtra>
    implements IExpandedODataQuery<TEntity, TProperty, TOptions, TResponse, TExtra> {

    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, prm1?: K2[] | Predicate<AU<TProperty[K1]>>, prm2?: Predicate<AU<TProperty[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, ...scopes);
        return this.createExpandedQuery<any>(new QueryPart(ODataFuncs.thenExpand, args));
    }
}

class FunctionODataQuery<T extends object, TOptions extends ODataOptions = ODataOptions, TResponse = any, TExtra = {}>
    extends ODataQuery<T, TOptions, TResponse, TExtra> implements IFunctionODataQuery<T, TOptions, TResponse, TExtra> {

    public withParameters(params: object | boolean | number | string | bigint) {
        return this.createFunctionQuery(new QueryPart(ODataFuncs.funcParams, [PartArgument.literal(params)]));
    }
}

export interface IODataQuery<T, TOptions extends ODataOptions, TResponse, TExtra> extends IQueryBase {
    byKey(key: SingleKey | CompositeKey<T>): IODataQuery<T, TOptions, TResponse, TExtra>;
    action(name: string): IODataQuery<T, TOptions, TResponse, TExtra>;
    function(name: string): IFunctionODataQuery<T, TOptions, TResponse, TExtra>;
    navigateTo<TNav extends object>(keySelector: Func1<T, TNav>, ...scopes: any[]): IODataQuery<AU<TNav>, TOptions, TResponse, TExtra>;
    inlineCount(value?: boolean): IODataQuery<T, TOptions, TResponse, TExtra & InlineCountInfo>;
    where(predicate: Predicate<T>, ...scopes: any[]): IODataQuery<T, TOptions, TResponse, TExtra>;
    orderBy(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra>;
    orderByDescending(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<T, AU<T[K1]>, TOptions, TResponse, TExtra>;
    skip(count: number): IODataQuery<T, TOptions, TResponse, TExtra>;
    take(count: number): IODataQuery<T, TOptions, TResponse, TExtra>;
    cast(ctor: Ctor<T>): IODataQuery<T, TOptions, TResponse, TExtra>;
    select<K extends keyof T>(...names: K[]): IODataQuery<Pick<T, K>, TOptions, TResponse, TExtra>;
    setData(value: any): IODataQuery<T, TOptions, TResponse, TExtra>;
    withOptions(options: TOptions): IODataQuery<T, TOptions, TResponse, TExtra>;

    groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>, elementSelector?: Func1<T[] & TKey, TResult>, ...scopes: any[])
        : PromiseLike<Result<TResult[], TExtra>>;
    count(predicate?: Predicate<T>, ...scopes: any[]): PromiseLike<Result<number, TExtra>>;
    toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>>;
    singleAsync(ctor?: Ctor<T>): PromiseLike<Result<T, TExtra>>;
    insertAsync(returnInserted?: boolean): PromiseLike<Result<T, TExtra>>;
    updateAsync(returnUpdated?: boolean): PromiseLike<Result<T, TExtra>>;
    deleteAsync(): PromiseLike<Result<void, TExtra>>;
    executeAsync<TResult extends any = void>(): PromiseLike<Result<TResult, TExtra>>;
}

export interface IOrderedODataQuery<T, TOptions extends ODataOptions, TResponse, TExtra> extends IODataQuery<T, TOptions, TResponse, TExtra> {
    thenBy(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra>;
    thenByDescending(keySelector: Func1<T>, ...scopes: any[]): IOrderedODataQuery<T, TOptions, TResponse, TExtra>;
}

export interface IExpandedODataQuery<TEntity, TProperty, TOptions extends ODataOptions, TResponse, TExtra>
    extends IODataQuery<TEntity, TOptions, TResponse, TExtra> {
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes: any[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TOptions, TResponse, TExtra>;
}

export interface IFunctionODataQuery<T, TOptions extends ODataOptions, TResponse, TExtra>
    extends IODataQuery<T, TOptions, TResponse, TExtra> {
    withParameters(params: object | boolean | number | string | bigint): IODataQuery<T, TOptions, TResponse, TExtra>;
}

// exclude undefined
type XU<T> = T extends undefined ? never : T;

// Array un-wrapper
type AU<T> = XU<T extends any[] ? T[0] : T>;

function createExpandArgs(nav: any, prm1?: any, prm2?: any, ...scopes: any[]) {
    let selector: any;
    let filter: any;
    if (typeof prm1 !== "function" && typeof prm1 !== "string") {
        selector = prm1;
        filter = prm2;
    } else {
        filter = prm1;
        scopes = prm2 ? [prm2, ...scopes] : scopes;
    }

    return [PartArgument.literal(nav), PartArgument.literal(selector), PartArgument.identifier(filter, scopes)];
}
