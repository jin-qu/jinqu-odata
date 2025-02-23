import { plainToInstance } from "class-transformer";
import {
    AjaxFuncs, AjaxOptions, Ctor, IAjaxProvider, IQueryPart,
    IQueryProvider, mergeAjaxOptions, QueryFunc, QueryParameter
} from "jinqu";
import { ODataQuery } from "./odata-query";
import { handleParts, ODataFuncs } from "./shared";

export interface ODataOptions extends AjaxOptions {
    $baseAddress?: string;
    $updateMethod?: "PATCH" | "PUT";
}

export class ODataQueryProvider<TOptions extends ODataOptions, TResponse> implements IQueryProvider {

    constructor(protected readonly ajaxProvider: IAjaxProvider<TResponse, TOptions>) {
    }

    public createQuery<T extends object>(parts?: IQueryPart[]): ODataQuery<T, TOptions, TResponse> {
        return new ODataQuery<T, TOptions, TResponse>(this, parts);
    }

    public execute<T = any, TResult = PromiseLike<T[]>>(_parts: IQueryPart[]): TResult {
        throw new Error("Synchronous execution is not supported");
    }

    public executeAsync(parts: IQueryPart[]) {
        const [queryParams, options, ctor] = handleParts<TOptions>(parts);
        return this.request(queryParams, options, ctor) as any;
    }

    private async request(params: QueryParameter[], options: TOptions[], ctor: Ctor<unknown>): Promise<unknown> {
        let o = (options || []).reduce(ODataQueryProvider.mergeOptions, {}) as TOptions;
        if (o.$baseAddress) {
            if (o.$baseAddress[o.$baseAddress.length - 1] !== "/" && o.$url && o.$url[0] !== "/") {
                o.$url = "/" + o.$url;
            }
            o.$url = o.$baseAddress + (o.$url || "");
        }

        let includeResponse = false;
        let countPrm: QueryParameter = null;
        let keyPrm: QueryParameter = null;
        let actPrm: QueryParameter = null;
        let funcPrm: QueryParameter = null;
        let funcParamsPrm: QueryParameter = null;
        let navigateToPrm: QueryParameter = null;
        o.$params = o.$params || [];
        params = params || [];
        let inlineCountEnabled = false;
        params.forEach(p => {
            if (p.key === ODataFuncs.byKey) {
                keyPrm = p;
            } else if (p.key === ODataFuncs.navigateTo) {
                navigateToPrm = p;
            } else if (p.key === ODataFuncs.action) {
                actPrm = p;
            } else if (p.key === ODataFuncs.function) {
                funcPrm = p;
            } else if (p.key === ODataFuncs.funcParams) {
                funcParamsPrm = p;
            } else if (p.key === QueryFunc.inlineCount) {
                o.$params.push({ key: "$count", value: "true" });
                inlineCountEnabled = true;
            } else if (p.key === "$count") {
                countPrm = p;
            } else if (p.key === AjaxFuncs.includeResponse) {
                includeResponse = true;
            } else {
                o.$params.push(p);
            }
        });

        if (keyPrm) {
            o.$url += `(${keyPrm.value})`;
        }

        if (navigateToPrm) {
            o.$url += `/${navigateToPrm.value}`;
        }

        if (actPrm) {
            o.$url += `/${actPrm.value}`;
        } else if (funcPrm) {
            o.$url += `/${funcPrm.value}` + (funcParamsPrm ? `(${funcParamsPrm.value})` : "()");
        }

        if (o.$params.length) {
            o.$url += "?" + o.$params.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join("&");
        }
        o.$params = [];

        if (countPrm) {
            o.$url += "/$count";
            if (countPrm.value) {
                o.$url += `/?$filter=${encodeURIComponent(countPrm.value)}`;
            }
        }

        const r = await this.ajaxProvider.ajax(o)
        let value = (r.value as any)?.value ?? r.value;

        if (ctor) {
            value = plainToInstance(ctor, value);
        }

        if (!inlineCountEnabled && !includeResponse)
            return value;

        return {
            inlineCount: inlineCountEnabled ? Number(r.value && r.value["@odata.count"]) : void 0,
            response: includeResponse ? r.response : void 0,
            value,
        };
    }

    private static excludedKeys = new Set(["$url", "$method", "$params", "$data", "$timeout", "$headers"]);
    private static mergeOptions<TOptions extends ODataOptions>(opt1: TOptions, opt2: TOptions): TOptions {
        if (opt1 == null) return opt2;
        if (opt2 == null) return opt1;

        const merged = mergeAjaxOptions(opt1, opt2);

        const filteredOptions = {
            ...Object.fromEntries(
                Object.entries(opt1).filter(([key]) => !ODataQueryProvider.excludedKeys.has(key))
            ),
            ...Object.fromEntries(
                Object.entries(opt2).filter(([key]) => !ODataQueryProvider.excludedKeys.has(key))
            )
        };

        return { ...merged, ...filteredOptions } as TOptions;
    }
}
