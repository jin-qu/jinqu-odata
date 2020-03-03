import {
    AjaxFuncs, AjaxOptions, AjaxResponse,
    Ctor, Func1, IQueryBase, IQueryPart, IQueryProvider,
    PartArgument, Predicate, QueryPart, Result,
} from "jinqu";
import { InlineCountInfo } from "jinqu";
import { handleParts, ODataFuncs } from "./shared";

export class ODataQuery<
    T extends object,
    TOptions extends AjaxOptions = AjaxOptions,
    TResponse = Response, TExtra = {}>
    implements IODataQuery<T, TExtra> {

    constructor(public readonly provider: IQueryProvider, public readonly parts: IQueryPart[] = []) {
    }

    public withOptions(options: AjaxOptions): ODataQuery<T, TOptions, TResponse, TExtra> {
        return this.create(QueryPart.create(AjaxFuncs.options, [PartArgument.literal(options)])) as any;
    }

    public setParameter(key: string, value: any): ODataQuery<T, TOptions, TResponse, TExtra> {
        return this.withOptions({ params: [{ key, value }] });
    }

    public includeResponse(): ODataQuery<T, TOptions, TResponse, TExtra & AjaxResponse<TResponse>> {
        const part = new QueryPart(AjaxFuncs.includeResponse, []);
        return this.create(part) as any;
    }

    public inlineCount(): IODataQuery<T, TExtra & InlineCountInfo> {
        return this.create(QueryPart.inlineCount());
    }

    public where(predicate: Predicate<T>, ...scopes): IODataQuery<T, TExtra> {
        const part = new QueryPart(ODataFuncs.filter, [PartArgument.identifier(predicate, scopes)]);
        return this.create(part);
    }

    public orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.orderBy(keySelector, scopes));
    }

    public orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.orderByDescending(keySelector, scopes));
    }

    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes)
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        // tslint:disable-next-line:unified-signatures
        nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes)
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    public expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        nav: K1, prm1?: K2[] | Predicate<AU<T[K1]>>, prm2?: Predicate<AU<T[K1]>>, ...scopes)
            : IExpandedODataQuery<T, AU<T[K1]>, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, ...scopes);
        return this.createExpandedQuery<AU<T[K1]>>(new QueryPart(ODataFuncs.expand, args));
    }

    public skip(count: number): IODataQuery<T, TExtra> {
        return this.create(QueryPart.skip(count));
    }

    public take(count: number): IODataQuery<T, TExtra> {
        const part = new QueryPart(ODataFuncs.top, [PartArgument.literal(count)]);
        return this.create(part);
    }

    public select<K extends keyof T>(...names: K[]): PromiseLike<Result<Array<Pick<T, K>>, TExtra>> {
        const part = new QueryPart(ODataFuncs.oDataSelect, [PartArgument.literal(names)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    public groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>,
        elementSelector?: Func1<T[] & TKey, TResult>,
        ...scopes: any[]): PromiseLike<Result<TResult[], TExtra>> {

        const args = [new PartArgument(keySelector, null, scopes)];
        if (elementSelector) {
            args.push(new PartArgument(elementSelector, null, scopes));
        }
        const part = new QueryPart(ODataFuncs.apply, args);
        return this.provider.executeAsync([...this.parts, part]) as any;
    }

    public count(predicate?: Predicate<T>, ...scopes): PromiseLike<Result<number, TExtra>> {
        return this.provider.executeAsync([...this.parts, QueryPart.count(predicate, scopes)]);
    }

    public cast(ctor: Ctor<T>): IODataQuery<T, TExtra> {
        return this.create(QueryPart.cast(ctor));
    }

    public toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>> {
        const query = ctor ? this.cast(ctor) : this;
        return (query.provider as any).executeAsync([...query.parts, QueryPart.toArray()]);
    }

    public toString() {
        const [queryParams] = handleParts(this.parts);
        return queryParams.map((p) => `${p.key}=${p.value}`).join("&");
    }

    protected create<TResult extends object = T, TNewExtra = TExtra>(part: IQueryPart)
        : IODataQuery<TResult, TNewExtra> {
        return new ODataQuery<TResult, TOptions, TResponse, TNewExtra>(this.provider, [...this.parts, part]);
    }

    protected createOrderedQuery(part: IQueryPart): IOrderedODataQuery<T, TExtra> {
        return new OrderedODataQuery<T, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    protected createExpandedQuery<TNav>(part: IQueryPart): IExpandedODataQuery<T, TNav, TExtra> {
        return new ExpandedODataQuery<T, TNav, TOptions, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }
}

// tslint:disable-next-line:max-classes-per-file
class OrderedODataQuery<T extends object, TOptions extends AjaxOptions = AjaxOptions, TResponse = any, TExtra = {}>
    extends ODataQuery<T, TOptions, TResponse, TExtra> implements IOrderedODataQuery<T, TExtra> {

    public thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.thenBy(keySelector, scopes));
    }

    public thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.thenByDescending(keySelector, scopes));
    }
}

// tslint:disable-next-line:max-classes-per-file
class ExpandedODataQuery<
    TEntity extends object, TProperty,
    TOptions extends AjaxOptions = AjaxOptions,
    TResponse = any, TExtra = {}>
    extends ODataQuery<TEntity, TOptions, TResponse, TExtra>
    implements IExpandedODataQuery<TEntity, TProperty, TExtra> {

    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes)
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes)
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    public thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, prm1?: K2[] | Predicate<AU<TProperty[K1]>>, prm2?: Predicate<AU<TProperty[K1]>>, ...scopes)
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, ...scopes);
        return this.createExpandedQuery<any>(new QueryPart(ODataFuncs.thenExpand, args));
    }
}

export interface IODataQuery<T, TExtra = {}> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T, TExtra & InlineCountInfo>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T, TExtra>;
    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes)
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes)
        : IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    skip(count: number): IODataQuery<T, TExtra>;
    take(count: number): IODataQuery<T, TExtra>;
    cast(ctor: Ctor<T>): IODataQuery<T, TExtra>;

    select<K extends keyof T>(...names: K[]): PromiseLike<Result<Array<Pick<T, K>>, TExtra>>;
    groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>, elementSelector?: Func1<T[] & TKey, TResult>, ...scopes: any[])
        : PromiseLike<Result<TResult[], TExtra>>;
    count(predicate?: Predicate<T>, ...scopes): PromiseLike<Result<number, TExtra>>;
    toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>>;
}

export interface IOrderedODataQuery<T, TExtra = {}> extends IODataQuery<T, TExtra> {
    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
}

export interface IExpandedODataQuery<TEntity, TProperty, TExtra = {}> extends IODataQuery<TEntity, TExtra> {
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[])
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes)
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(
        nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes)
        : IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
}

// Array un-wrapper
type AU<T> = T extends any[] ? T[0] : T;

function createExpandArgs(nav: any, prm1?: any, prm2?: any, ...scopes) {
    let selector;
    let filter;
    if (typeof prm1 !== "function" && typeof prm1 !== "string") {
        selector = prm1;
        filter = prm2;
    } else {
        filter = prm1;
        scopes = prm2 ? [prm2, ...scopes] : scopes;
    }

    return [PartArgument.literal(nav), PartArgument.literal(selector), PartArgument.identifier(filter, scopes)];
}
