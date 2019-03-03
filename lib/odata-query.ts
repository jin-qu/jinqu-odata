import {
    IQueryProvider, IQueryPart, Predicate, Func1, IQueryBase, 
    QueryPart, PartArgument, AjaxOptions, AjaxFuncs, Ctor, Result, AjaxResponse
} from "jinqu";
import { InlineCountInfo } from "jinqu";

export class ODataQuery<T extends object, TResponse = any, TExtra = {}> implements IODataQuery<T, TExtra> {

    constructor(public readonly provider: IQueryProvider, public readonly parts: IQueryPart[] = []) {
    }

    withOptions(options: AjaxOptions): ODataQuery<T, TResponse, TExtra> {
        return <any>this.create(QueryPart.create(AjaxFuncs.options, [PartArgument.literal(options)]));
    }

    setParameter(key: string, value: any): ODataQuery<T, TResponse, TExtra> {
        return this.withOptions({ params: [{ key, value }] });
    }

    includeResponse(): ODataQuery<T, TResponse, TExtra & AjaxResponse<TResponse>> {
        const part = new QueryPart(AjaxFuncs.includeResponse, []);
        return <any>this.create(part);
    }

    inlineCount(): IODataQuery<T, TExtra & InlineCountInfo> {
        return this.create(QueryPart.inlineCount());
    }

    where(predicate: Predicate<T>, ...scopes): IODataQuery<T, TExtra> {
        const part = new QueryPart(ODataFuncs.filter, [PartArgument.identifier(predicate, scopes)]);
        return this.create(part);
    }

    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.orderBy(keySelector, scopes));
    }

    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.orderByDescending(keySelector, scopes));
    }

    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, prm1?: K2[] | Predicate<AU<T[K1]>>, prm2?: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, scopes);
        return this.createExpandedQuery<AU<T[K1]>>(new QueryPart(ODataFuncs.expand, args));
    }

    skip(count: number): IODataQuery<T, TExtra> {
        return this.create(QueryPart.skip(count));
    }

    take(count: number): IODataQuery<T, TExtra> {
        const part = new QueryPart(ODataFuncs.top, [PartArgument.literal(count)]);
        return this.create(part);
    }

    select<K extends keyof T>(...names: K[]): PromiseLike<Result<Pick<T, K>[], TExtra>> {
        const part = new QueryPart(ODataFuncs.oDataSelect, [PartArgument.literal(names)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>,
        elementSelector?: Func1<Array<T> & TKey, TResult>,
        ...scopes: any[]): PromiseLike<Result<TResult[], TExtra>> {

        const args = [new PartArgument(keySelector, null, scopes)];
        if (elementSelector) {
            args.push(new PartArgument(elementSelector, null, scopes));
        }
        const part = new QueryPart(ODataFuncs.apply, args);
        return <any>this.provider.executeAsync([...this.parts, part]);
    }

    count(predicate?: Predicate<T>, ...scopes): PromiseLike<Result<number, TExtra>> {
        return this.provider.executeAsync([...this.parts, QueryPart.count(predicate, scopes)]);
    }

    cast(ctor: Ctor<T>): IODataQuery<T, TExtra> {
        return this.create(QueryPart.cast(ctor));
    }

    toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>> {
        const query = ctor ? this.cast(ctor) : this;
        return (<any>query.provider).executeAsync([...query.parts, QueryPart.toArray()]);
    }

    protected create<TResult extends object = T, TNewExtra = TExtra>(part: IQueryPart): IODataQuery<TResult, TNewExtra> {
        return new ODataQuery<TResult, TResponse, TNewExtra>(this.provider, [...this.parts, part]);
    }

    protected createOrderedQuery(part: IQueryPart): IOrderedODataQuery<T, TExtra> {
        return new OrderedODataQuery<T, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }

    protected createExpandedQuery<TNav>(part: IQueryPart): IExpandedODataQuery<T, TNav, TExtra> {
        return new ExpandedODataQuery<T, TNav, TResponse, TExtra>(this.provider, [...this.parts, part]);
    }
}

class OrderedODataQuery<T extends object, TResponse = any, TExtra = {}> extends ODataQuery<T, TResponse, TExtra> implements IOrderedODataQuery<T, TExtra> {

    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.thenBy(keySelector, scopes));
    }

    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra> {
        return this.createOrderedQuery(QueryPart.thenByDescending(keySelector, scopes));
    }
}

class ExpandedODataQuery<TEntity extends object, TProperty, TResponse = any, TExtra = {}> extends ODataQuery<TEntity, TResponse, TExtra> implements IExpandedODataQuery<TEntity, TProperty, TExtra> {

    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, prm1?: K2[] | Predicate<AU<TProperty[K1]>>, prm2?: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra> {
        const args = createExpandArgs(nav, prm1, prm2, scopes);
        return this.createExpandedQuery<any>(new QueryPart(ODataFuncs.thenExpand, args));
    }
}

export interface IODataQuery<T, TExtra = {}> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T, TExtra & InlineCountInfo>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T, TExtra>;
    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>, TExtra>;
    skip(count: number): IODataQuery<T, TExtra>;
    take(count: number): IODataQuery<T, TExtra>;
    cast(ctor: Ctor<T>): IODataQuery<T, TExtra>;

    select<K extends keyof T>(...names: K[]): PromiseLike<Result<Pick<T, K>[], TExtra>>;
    groupBy<TKey extends object, TResult extends object>(keySelector: Func1<T, TKey>,
        elementSelector?: Func1<Array<T> & TKey, TResult>, ...scopes: any[]): PromiseLike<Result<TResult[], TExtra>>;
    count(predicate?: Predicate<T>, ...scopes): PromiseLike<Result<number, TExtra>>;
    toArrayAsync(ctor?: Ctor<T>): PromiseLike<Result<T[], TExtra>>;
}

export interface IOrderedODataQuery<T, TExtra = {}> extends IODataQuery<T, TExtra> {
    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T, TExtra>;
}

export interface IExpandedODataQuery<TEntity, TProperty, TExtra = {}> extends IODataQuery<TEntity, TExtra> {
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>, TExtra>;
}

export const ODataFuncs = {
    filter: 'filter',
    oDataSelect: 'oDataSelect',
    top: 'top',
    expand: 'expand',
    thenExpand: 'thenExpand',
    apply: 'apply'
};

// Array Unwrapper
type AU<T> = T extends Array<any> ? T[0] : T;

function createExpandArgs(nav: any, prm1?: any, prm2?: any, ...scopes) {
    let selector, filter;
    if (typeof prm1 !== 'function' && typeof prm1 !== 'string') {
        selector = prm1;
        filter = prm2;
    }
    else {
        filter = prm1;
        scopes = prm2 ? [prm2, ...scopes] : scopes;
    }
    
    return [PartArgument.literal(nav), PartArgument.literal(selector), PartArgument.identifier(filter, scopes)];
}
