import {
    IQueryProvider, IQueryPart, Predicate, Func1, IQueryBase,
    InlineCountInfo, QueryPart, PartArgument, AjaxOptions, AjaxFuncs, QueryFunc, IOrderedQuery, Query, Ctor
} from "jinqu";

export class ODataQuery<T> implements IODataQuery<T> {

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
        return this.create(QueryPart.where(predicate, scopes));
    }

    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.orderBy(keySelector, scopes));
    }

    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.orderByDescending(keySelector, scopes));
    }

    expand<TNav extends Object>(navigationSelector: Func1<T, TNav[] | TNav>, selector?: Func1<TNav, any>, ...scopes): IExpandedODataQuery<T, TNav> {
        const args = [PartArgument.identifier(navigationSelector, scopes)];
        if (selector) {
            args.push(PartArgument.identifier(selector, scopes));
        }

        return this.createExpandedQuery<TNav>(new QueryPart(ODataFuncs.expand, args, scopes));
    }

    skip(count: number): IODataQuery<T> {
        return this.create(QueryPart.skip(count));
    }

    top(count: number): IODataQuery<T> {
        return this.create(QueryPart.take(count));
    }

    select<TResult extends object>(selector: Func1<T, TResult>, ...scopes): PromiseLike<TResult[] & InlineCountInfo>;
    select<TResult extends object>(selector: Func1<T, TResult>, ctor: Ctor<T>, ...scopes): PromiseLike<TResult[] & InlineCountInfo> {
        const [q, s] = this.fixCtorArg(ctor, scopes);

        return q.provider.executeAsync([...q.parts, QueryPart.select(selector, s)]);
    }

    groupBy<TKey extends object, TResult extends object>(keySelector: Func1<T, TKey>, 
        elementSelector?: Func1<Array<T> & TKey, TResult>, ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo>;
    groupBy<TKey extends object, TResult extends object>(
        keySelector: Func1<T, TKey>, elementSelector?: Func1<Array<T> & TKey, TResult>,
        ctor?: Ctor<TResult>, ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo> {

        const [q, s] = this.fixCtorArg(ctor, scopes);

        const args = [new PartArgument(keySelector, null, s)];
        if (elementSelector) {
            args.push(new PartArgument(elementSelector, null, s));
        }
        const part = new QueryPart(ODataFuncs.apply, args);
        return <any>q.provider.executeAsync([...q.parts, part]);
    }

    count(predicate?: Predicate<T>, ...scopes) {
        return this.provider.executeAsync([...this.parts, QueryPart.count(predicate, scopes)]);
    }

    cast(ctor: Ctor<T>) {
        return this.create<T>(QueryPart.cast(ctor));
    }

    toArrayAsync(ctor?: Ctor<T>): PromiseLike<T[] & InlineCountInfo> {
        const query = ctor ? this.cast(ctor) : this;
        return (<any>query.provider).executeAsync([...query.parts, QueryPart.toArray()]);
    }

    protected create<T>(part: IQueryPart): IODataQuery<T> {
        return new ODataQuery<T>(this.provider, [...this.parts, part]);
    }

    protected createOrderedQuery(part: IQueryPart) {
        return new OrderedODataQuery<T>(this.provider, [...this.parts, part]);
    }

    protected createExpandedQuery<TNav extends Object>(part: IQueryPart) {
        return new ExpandedODataQuery<T, TNav>(this.provider, [...this.parts, part]);
    }

    protected fixCtorArg(ctor: Ctor<any>, scopes: any[]): [IODataQuery<T>, any[]] {
        if (ctor && typeof ctor !== 'function') {
            scopes = [ctor, ...scopes];
            ctor = null;
        }

        return [ctor ? this.cast(ctor) : this, scopes]
    }
}

class OrderedODataQuery<T> extends ODataQuery<T> implements IOrderedODataQuery<T> {

    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.thenBy(keySelector, scopes));
    }

    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return this.createOrderedQuery(QueryPart.thenByDescending(keySelector, scopes));
    }
}

class ExpandedODataQuery<TEntity, TProperty> extends ODataQuery<TEntity> implements IExpandedODataQuery<TEntity, TProperty> {

    thenExpand<TNav extends Object>(navigationSelector: Func1<TProperty, TNav[] | TNav>, selector?: Func1<TNav, any>, ...scopes): IExpandedODataQuery<TEntity, TNav> {
        const args = [PartArgument.identifier(navigationSelector, scopes)];
        if (selector) {
            args.push(PartArgument.identifier(selector, scopes));
        }

        return this.createExpandedQuery<TNav>(new QueryPart(ODataFuncs.thenExpand, args, scopes));
    }
}

export interface IODataQuery<T> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T>;
    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    expand<TNav extends Object>(navigationSelector: Func1<T, TNav[] | TNav>, selector?: Func1<TNav, any>, ...scopes): IExpandedODataQuery<T, TNav>;
    skip(count: number): IODataQuery<T>;
    top(count: number): IODataQuery<T>;
    cast(ctor: Ctor<T>): IODataQuery<T>;

    select<TResult = any>(selector: Func1<T, TResult>, ...scopes): PromiseLike<TResult[] & InlineCountInfo>;
    select<TResult = any>(selector: Func1<T, TResult>, ctor: Ctor<T>, ...scopes): PromiseLike<TResult[] & InlineCountInfo>;
    groupBy<TKey extends object, TResult extends object>(keySelector: Func1<T, TKey>, 
        elementSelector?: Func1<Array<T> & TKey, TResult>, ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo>;
    groupBy<TKey extends object, TResult extends object>(keySelector: Func1<T, TKey>, 
        elementSelector?: Func1<Array<T> & TKey, TResult>, ctor?: Ctor<T>, ...scopes: any[]): PromiseLike<TResult[] & InlineCountInfo>;
    count(predicate?: Predicate<T>, ...scopes): PromiseLike<T[] & InlineCountInfo>;
    toArrayAsync(ctor?: Ctor<T>): PromiseLike<T[] & InlineCountInfo>;
}

export interface IOrderedODataQuery<T> extends IODataQuery<T> {
    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
}

export interface IExpandedODataQuery<TEntity, TProperty> extends IODataQuery<TEntity> {
    thenExpand<TNav extends Object>(navigationSelector: Func1<TProperty, TNav[] | TNav>, selector?: Func1<TNav, any>, ...scopes): IExpandedODataQuery<TEntity, TNav>;
}

export const ODataFuncs = {
    expand: 'expand',
    thenExpand: 'thenExpand',
    apply: 'apply'
};
