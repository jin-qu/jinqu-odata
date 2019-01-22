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

    expand<TNav extends object>(navigationSelector: Func1<T, TNav[] | TNav>, selector?: Func1<TNav, any>): IExpandedODataQuery<T, TNav> {
        const args = [PartArgument.identifier(navigationSelector, null)];
        if (selector) {
            args.push(PartArgument.identifier(selector, null));
        }

        return this.createExpandedQuery<TNav>(new QueryPart(ODataFuncs.expand, args));
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
        return this.create<T>(QueryPart.cast(ctor));
    }

    toArrayAsync(ctor?: Ctor<T>): PromiseLike<T[] & InlineCountInfo> {
        const query = ctor ? this.cast(ctor) : this;
        return (<any>query.provider).executeAsync([...query.parts, QueryPart.toArray()]);
    }

    protected create<T extends object>(part: IQueryPart): IODataQuery<T> {
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

    thenExpand<TNav extends object>(navigationSelector: Func1<TProperty, TNav[] | TNav>, selector?: Func1<TNav, any>): IExpandedODataQuery<TEntity, TNav> {
        const args = [PartArgument.identifier(navigationSelector, null)];
        if (selector) {
            args.push(PartArgument.identifier(selector, null));
        }

        return this.createExpandedQuery<TNav>(new QueryPart(ODataFuncs.thenExpand, args));
    }
}

export interface IODataQuery<T> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T>;
    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    expand<TNav extends object>(navigationSelector: Func1<T, TNav[] | TNav>, selector?: Func1<TNav, any>): IExpandedODataQuery<T, TNav>;
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
    thenExpand<TNav extends object>(navigationSelector: Func1<TProperty, TNav[] | TNav>, selector?: Func1<TNav, any>): IExpandedODataQuery<TEntity, TNav>;
}

export const ODataFuncs = {
    filter: 'filter',
    oDataSelect: 'oDataSelect',
    top: 'top',
    expand: 'expand',
    thenExpand: 'thenExpand',
    apply: 'apply'
};
