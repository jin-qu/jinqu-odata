import {
    IQueryProvider, IQueryPart, Predicate, Func1, IQueryBase,
    InlineCountInfo, QueryPart, PartArgument, AjaxOptions, AjaxFuncs, Ctor
} from "jinqu";

export class ODataQuery<T extends object> implements IODataQuery<T> {

    constructor(public readonly provider: IQueryProvider, public readonly parts: IQueryPart[] = []) {
    }

    withOptions(options: AjaxOptions): ODataQuery<T> {
        return <any>this.create(QueryPart.create(AjaxFuncs.options, [PartArgument.literal(options)]));
    }

    setParameter(key: string, value: any): ODataQuery<T> {
        return this.withOptions({ params: [{ key, value }] });
    }

    inlineCount(value?: boolean): IODataQuery<T> {
        return this.create(QueryPart.inlineCount(value));
    }

    where(predicate: Predicate<T>, ...scopes): IODataQuery<T> {
        const part = new QueryPart(ODataFuncs.filter, [PartArgument.identifier(predicate, scopes)]);
        return this.create(part);
    }

    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.orderBy(keySelector, scopes));
    }

    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.orderByDescending(keySelector, scopes));
    }

    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<T, AU<T[K1]>>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, prm1?: K2[] | Predicate<AU<T[K1]>>, prm2?: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>> {
        const args = createExpandArgs(nav, prm1, prm2, scopes);
        return this.createExpandedQuery<any>(new QueryPart(ODataFuncs.expand, args));
    }

    skip(count: number): IODataQuery<T> {
        return this.create(QueryPart.skip(count));
    }

    take(count: number): IODataQuery<T> {
        const part = new QueryPart(ODataFuncs.top, [PartArgument.literal(count)]);
        return this.create(part);
    }

    select<K extends keyof T>(...names: K[]): PromiseLike<Pick<T, K>[] & InlineCountInfo> {
        const part = new QueryPart(ODataFuncs.oDataSelect, [PartArgument.literal(names)]);
        return this.provider.executeAsync([...this.parts, part]);
    }

    groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>,
        elementSelector?: Func1<Array<T> & TKey, TResult>,
        ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo> {

        const args = [new PartArgument(keySelector, null, scopes)];
        if (elementSelector) {
            args.push(new PartArgument(elementSelector, null, scopes));
        }
        const part = new QueryPart(ODataFuncs.apply, args);
        return <any>this.provider.executeAsync([...this.parts, part]);
    }

    count(predicate?: Predicate<T>, ...scopes): PromiseLike<number> {
        return this.provider.executeAsync([...this.parts, QueryPart.count(predicate, scopes)]);
    }

    cast(ctor: Ctor<T>) {
        return this.create(QueryPart.cast(ctor));
    }

    toArrayAsync(ctor?: Ctor<T>): PromiseLike<T[] & InlineCountInfo> {
        const query = ctor ? this.cast(ctor) : this;
        return (<any>query.provider).executeAsync([...query.parts, QueryPart.toArray()]);
    }

    protected create(part: IQueryPart): IODataQuery<T> {
        return new ODataQuery<T>(this.provider, [...this.parts, part]);
    }

    protected createOrderedQuery(part: IQueryPart) {
        return new OrderedODataQuery<T>(this.provider, [...this.parts, part]);
    }

    protected createExpandedQuery<TNav extends object>(part: IQueryPart) {
        return new ExpandedODataQuery<T, TNav>(this.provider, [...this.parts, part]);
    }
}

class OrderedODataQuery<T extends object> extends ODataQuery<T> implements IOrderedODataQuery<T> {

    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.thenBy(keySelector, scopes));
    }

    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.thenByDescending(keySelector, scopes));
    }
}

class ExpandedODataQuery<TEntity extends object, TProperty> extends ODataQuery<TEntity> implements IExpandedODataQuery<TEntity, TProperty> {

    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, prm1?: K2[] | Predicate<AU<TProperty[K1]>>, prm2?: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>> {
        const args = createExpandArgs(nav, prm1, prm2, scopes);
        return this.createExpandedQuery<any>(new QueryPart(ODataFuncs.thenExpand, args));
    }
}

export interface IODataQuery<T> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T>;
    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<T, AU<T[K1]>>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>>;
    expand<K1 extends keyof T, K2 extends keyof AU<T[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<T[K1]>>, ...scopes): IExpandedODataQuery<T, AU<T[K1]>>;
    skip(count: number): IODataQuery<T>;
    take(count: number): IODataQuery<T>;
    cast(ctor: Ctor<T>): IODataQuery<T>;

    select<K extends keyof T>(...names: K[]): PromiseLike<Pick<T, K>[] & InlineCountInfo>;
    groupBy<TKey extends object, TResult extends object>(keySelector: Func1<T, TKey>,
        elementSelector?: Func1<Array<T> & TKey, TResult>, ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo>;
    count(predicate?: Predicate<T>, ...scopes): PromiseLike<number>;
    toArrayAsync(ctor?: Ctor<T>): PromiseLike<T[] & InlineCountInfo>;
}

export interface IOrderedODataQuery<T> extends IODataQuery<T> {
    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
}

export interface IExpandedODataQuery<TEntity, TProperty> extends IODataQuery<TEntity> {
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector?: K2[]): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
    thenExpand<K1 extends keyof TProperty, K2 extends keyof AU<TProperty[K1]>>(nav: K1, selector: K2[], filter: Predicate<AU<TProperty[K1]>>, ...scopes): IExpandedODataQuery<TEntity, AU<TProperty[K1]>>;
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