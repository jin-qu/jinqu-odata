import { plainToClass } from "class-transformer";
import { AjaxOptions, IQueryPart, IQueryProvider, IRequestProvider } from "jinqu";
import { ODataQuery } from "./odata-query";
import { handleParts } from "./shared";

export class ODataQueryProvider<TOptions extends AjaxOptions, TResponse> implements IQueryProvider {

    constructor(protected requestProvider: IRequestProvider<AjaxOptions>) {
    }

    public get updateMethod(): "PATCH" | "PUT" {
        return (this.requestProvider as any).options.updateMethod;
    }

    public createQuery<T extends object>(parts?: IQueryPart[]): ODataQuery<T, TOptions, TResponse> {
        return new ODataQuery<T, TOptions, TResponse>(this, parts);
    }

    public execute<T = any, TResult = PromiseLike<T[]>>(parts: IQueryPart[]): TResult {
        throw new Error("Synchronous execution is not supported");
    }

    public executeAsync<T = any, TResult = T[]>(parts: IQueryPart[]): PromiseLike<TResult> {
        const [queryParams, options, ctor] = handleParts(parts);
        const promise = this.requestProvider.request<TResult>(queryParams, options);
        if (ctor) {
            return promise.then((d: any) => {
                if ((d.inlineCount !== void 0 || d.response) && d.value !== void 0) {
                    d.value = plainToClass(ctor, d.value);
                    return d;
                } else {
                    return plainToClass(ctor, d);
                }
            })
        } else {
            return promise;
        }
    }
}

