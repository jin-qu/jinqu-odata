import { 
    IQueryProvider, IQueryPart, Predicate, Func1, Func2, IQueryBase, 
    InlineCountInfo, QueryPart, PartArgument, AjaxOptions, AjaxFuncs 
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

    orderBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return <any>this.create(QueryPart.orderBy(keySelector, scopes));
    }

    orderByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return <any>this.create(QueryPart.orderByDescending(keySelector, scopes));
    }

    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return <any>this.create(QueryPart.thenBy(keySelector, scopes));
    }

    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T> {
        return <any>this.create(QueryPart.thenByDescending(keySelector, scopes));
    }

    select<TResult = any>(selector: Func1<T, TResult>, ...scopes): IODataQuery<T> {
        return this.create(QueryPart.select(selector, scopes));
    }

    expand<TNav>(navigationSelector: Func2<T, TNav>, selector?: Func2<TNav, any>, ...scopes): IODataQuery<T> {
        return this.create(createExpandPart(navigationSelector, selector, scopes));
    }

    skip(count: number): IODataQuery<T> {
        return this.create(QueryPart.skip(count));
    }

    top(count: number): IODataQuery<T> {
        return this.create(QueryPart.take(count));
    }

    toArrayAsync(): PromiseLike<T[] & InlineCountInfo> {
        return this.provider.executeAsync([...this.parts, QueryPart.toArray()]);
    }

    protected create<T>(part: IQueryPart): IODataQuery<T> {
        return <any>this.provider.createQuery([...this.parts, part]);
    }
}

export interface IODataQuery<T> extends IQueryBase {
    inlineCount(value?: boolean): IODataQuery<T>;
    where(predicate: Predicate<T>, ...scopes): IODataQuery<T>;
    orderBy(keySelector: Func1<T>, ...scopes): IODataQuery<T>;
    orderByDescending(keySelector: Func1<T>, ...scopes): IODataQuery<T>;
    select<TResult = any>(selector: Func1<T, TResult>, ...scopes): IODataQuery<T>;
    expand<TNav>(navigationSelector: Func2<T, TNav>, selector?: Func2<TNav, any>, ...scopes): IODataQuery<T>;
    skip(count: number): IODataQuery<T>;
    top(count: number): IODataQuery<T>;
    toArrayAsync(): PromiseLike<T[] & InlineCountInfo>;
}

export interface IOrderedODataQuery<T> extends IODataQuery<T> {
    thenBy(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
    thenByDescending(keySelector: Func1<T>, ...scopes): IOrderedODataQuery<T>;
}

export function createExpandPart<T, TNav>(navigationSelector: Func2<T, TNav>, selector: Func2<TNav, any>, scopes: any[]) {
    const args = [PartArgument.identifier(navigationSelector, scopes)];
    if (selector) {
        args.push(PartArgument.identifier(selector, scopes));
    }
    return new QueryPart(ODataFuncs.expand, args, scopes);
}

export const ODataFuncs = {
    expand: 'expand'
};

declare global {
    interface Array<T> {
        $expand<TNav>(navigationSelector: Func1<T, TNav>, selector?: Func1<TNav, any>): TNav;
    }
}

Array.prototype.$expand = function() {
    return this[0];
}
