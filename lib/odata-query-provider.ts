import { plainToInstance } from "class-transformer";
import { AjaxOptions, IQueryPart, IQueryProvider } from "jinqu";
import { ODataQuery } from "./odata-query";
import { handleParts } from "./shared";
import { IRequestProvider } from "./request-provider";

export class ODataQueryProvider<TOptions extends AjaxOptions, TResponse> implements IQueryProvider {

    constructor(protected requestProvider: IRequestProvider<TOptions>) {
    }

    public get updateMethod(): "PATCH" | "PUT" {
        return (this.requestProvider as any).options.updateMethod;
    }

    public createQuery<T extends object>(parts?: IQueryPart[]): ODataQuery<T, TOptions, TResponse> {
        return new ODataQuery<T, TOptions, TResponse>(this, parts);
    }

    public execute<T = any, TResult = PromiseLike<T[]>>(_parts: IQueryPart[]): TResult {
        throw new Error("Synchronous execution is not supported");
    }

    public executeAsync<T = any, TResult = T[]>(parts: IQueryPart[]): PromiseLike<TResult> {
        const [queryParams, options, ctor] = handleParts<TOptions>(parts);
        const promise = this.requestProvider.request<TResult>(queryParams, options);
        if (ctor) {
            return promise.then((d: any) => {
                if ((d.inlineCount !== void 0 || d.response) && d.value !== void 0) {
                    d.value = plainToInstance(ctor, d.value);
                    return d;
                } else
                    return plainToInstance(ctor, d);
            })
        } else
            return promise;
    }
}
