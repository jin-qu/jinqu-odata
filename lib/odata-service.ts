import {
    AjaxFuncs, AjaxOptions, Ctor,
    IAjaxProvider, IRequestProvider, mergeAjaxOptions,
    QueryFunc, QueryParameter, Result,
} from "jinqu";
import { FetchProvider } from "jinqu-fetch";
import { getResource } from "./decorators";
import { ODataQuery } from "./odata-query";
import { ODataQueryProvider } from "./odata-query-provider";
import { ODataFuncs } from "./shared";

export interface IAjaxInterceptor {
    intercept(options: AjaxOptions): AjaxOptions;
}

export interface IODataServiceOptions<TResponse> {
    baseAddress?: string;
    ajaxProvider?: IAjaxProvider<TResponse>;
    updateMethod?: "PATCH" | "PUT";
    ajaxInterceptor?: IAjaxInterceptor;
}

export class ODataService<TResponse = Response>
    implements IRequestProvider<AjaxOptions>  {

    public static readonly defaultAjaxOptions: AjaxOptions = {};

    public options: IODataServiceOptions<TResponse>;

    constructor(baseAddress?: string | null, ajaxProvider?: IAjaxProvider<TResponse>);
    constructor(options?: IODataServiceOptions<TResponse>);
    constructor(arg0?: string | IODataServiceOptions<TResponse>, arg1?: IAjaxProvider<TResponse>) {
        if (typeof arg0 === "string" || typeof arg1 !== "undefined") {
            this.options = {
                baseAddress: arg0 as string,
                ajaxProvider: arg1
            }
        } else if (typeof arg0 === "object" && typeof arg1 === "undefined") {
            this.options = arg0;
        }
        // default options
        if (!this.options) this.options = {};
        if (!this.options.baseAddress) this.options.baseAddress = "";
        if (!this.options.ajaxProvider) this.options.ajaxProvider = new FetchProvider() as any;
        if (!this.options.updateMethod) this.options.updateMethod = "PATCH";
    }

    public request<TResult, TExtra = {}>(params: QueryParameter[], options: AjaxOptions[])
        : PromiseLike<Result<TResult, TExtra>> {
        const d = Object.assign({}, ODataService.defaultAjaxOptions);
        let o = (options || []).reduce(mergeAjaxOptions, d);
        if (this.options.baseAddress) {
            if (this.options.baseAddress[this.options.baseAddress.length - 1] !== "/" && o.url && o.url[0] !== "/") {
                o.url = "/" + o.url;
            }
            o.url = this.options.baseAddress + (o.url || "");
        }

        let includeResponse = false;
        let countPrm: QueryParameter = null;
        let keyPrm: QueryParameter = null;
        let actPrm: QueryParameter = null;
        let funcPrm: QueryParameter = null;
        let funcParamsPrm: QueryParameter = null;
        let navigateToPrm: QueryParameter = null;
        o.params = o.params || [];
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
                o.params.push({ key: "$count", value: "true" });
                inlineCountEnabled = true;
            } else if (p.key === "$count") {
                countPrm = p;
            } else if (p.key === AjaxFuncs.includeResponse) {
                includeResponse = true;
            } else {
                o.params.push(p);
            }
        });

        if (keyPrm) {
            o.url += `(${keyPrm.value})`;
        }

        if (navigateToPrm) {
            o.url += `/${navigateToPrm.value}`;
        }

        if (actPrm) {
            o.url += `/${actPrm.value}`;
        } else if (funcPrm) {
            o.url += `/${funcPrm.value}` + (funcParamsPrm ? `(${funcParamsPrm.value})` : "()");
        }

        if (o.params.length) {
            o.url += "?" + o.params.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join("&");
        }
        o.params = [];

        if (countPrm) {
            o.url += "/$count";
            if (countPrm.value) {
                o.url += `/?$filter=${encodeURIComponent(countPrm.value)}`;
            }
        }

        if (this.options.ajaxInterceptor) {
            o = this.options.ajaxInterceptor.intercept(o);
        }

        return this.options.ajaxProvider.ajax(o)
            .then((r) => {
                let value = r.value as any;
                if (value) {
                    if (value.value !== void 0) {
                        value = value.value;
                    }
                }

                if (!inlineCountEnabled && !includeResponse) {
                    return value;
                }

                return {
                    inlineCount: inlineCountEnabled ? Number(r.value && r.value["@odata.count"]) : void 0,
                    response: includeResponse ? r.response : void 0,
                    value,
                };
            });
    }

    public createQuery<T extends object>(resource: string | Ctor<T>): ODataQuery<T, AjaxOptions, TResponse>;
    public createQuery<T extends object>(resource: string, ctor: Ctor<T>): ODataQuery<T, AjaxOptions, TResponse>;
    public createQuery<T extends object>(resource: string | Ctor<T>, ctor?: Ctor<T>)
        : ODataQuery<T, AjaxOptions, TResponse> {
        if (typeof resource === "function") {
            ctor = resource;
            resource = getResource(ctor as any);
            if (!resource) {
                const r = /class (.*?)\s|\{|function (.*?)[\s|\(]/.exec(ctor.toString());
                resource = r[1] || r[2];
            }
        }
        const query = new ODataQueryProvider<AjaxOptions, TResponse>(this)
            .createQuery<T>()
            .withOptions({ url: resource });
        return ctor ? query.cast(ctor) as any : query;
    }
}
