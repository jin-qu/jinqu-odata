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

export class ODataService<TResponse = Response>
    implements IRequestProvider<AjaxOptions>  {
    public static readonly defaultOptions: AjaxOptions = {};

    constructor(
        private readonly baseAddress = "",
        private readonly ajaxProvider: IAjaxProvider<TResponse> = new FetchProvider() as any) {
    }

    public request<TResult, TExtra>(params: QueryParameter[], options: AjaxOptions[])
        : PromiseLike<Result<TResult, TExtra>> {
        const d = Object.assign({}, ODataService.defaultOptions);
        const o = (options || []).reduce(mergeAjaxOptions, d);
        if (this.baseAddress) {
            if (this.baseAddress[this.baseAddress.length - 1] !== "/" && o.url && o.url[0] !== "/") {
                o.url = "/" + o.url;
            }
            o.url = this.baseAddress + (o.url || "");
        }

        let includeResponse = false;
        let countPrm: QueryParameter = null;
        let keyPrm: QueryParameter = null;
        o.params = o.params || [];
        params = params || [];
        let inlineCountEnabled = false;
        params.forEach(p => {
            if (p.key === ODataFuncs.byKey) {
                keyPrm = p;
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

        return this.ajaxProvider.ajax(o)
            .then(r => {
                let value = r.value as any;
                if (value && value.value !== void 0) {
                    value = value.value;
                }
                else {
                    //delete value["@odata.context"];
                    Object.keys(value).forEach((key: string) => {
                        if (key && key[0] === "@") {
                            delete value[key];    
                        }
                    });
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
