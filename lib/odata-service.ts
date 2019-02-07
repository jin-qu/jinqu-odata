import { 
    IAjaxProvider, QueryParameter, IRequestProvider,
    AjaxOptions, mergeAjaxOptions, Ctor, Result, AjaxFuncs, QueryFunc 
} from "jinqu";
import { FetchProvider } from 'jinqu-fetch';
import { ODataQueryProvider } from "./odata-query-provider";
import { ODataQuery } from "./odata-query";
import { getResource } from "./decorators";

export class ODataService<TResponse = Response> implements IRequestProvider<AjaxOptions>  {

    constructor(private readonly baseAddress = '', private readonly ajaxProvider: IAjaxProvider<TResponse> = <any>new FetchProvider()) {
    }

    static readonly defaultOptions: AjaxOptions = {};

    request<TResult, TExtra>(params: QueryParameter[], options: AjaxOptions[]): PromiseLike<Result<TResult, TExtra>> {
        const d = Object.assign({}, ODataService.defaultOptions);
        const o = (options || []).reduce(mergeAjaxOptions, d);
        if (this.baseAddress) {
            if (this.baseAddress[this.baseAddress.length - 1] !== '/' && o.url && o.url[0] !== '/') {
                o.url = '/' + o.url;
            }
            o.url = this.baseAddress + (o.url || '');
        }

        let includeResponse = false;
        let countPrm: QueryParameter = null;
        o.params = o.params || [];
        params = params || [];
        let inlineCountEnabled = false;
        params.forEach(p => {
            if (p.key === QueryFunc.inlineCount) {
                o.params.push({ key: '$count', value: 'true' });
                inlineCountEnabled = true;
            }
            else if (p.key === '$count') {
                countPrm = p;
            }
            else if (p.key === AjaxFuncs.includeResponse) {
                includeResponse = true;
            }
            else {
                o.params.push(p);
            }
        });

        if (o.params.length) {
            o.url += '?' + o.params.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join('&');
        }
        o.params = [];

        if (countPrm) {
            o.url += '/$count';
            if (countPrm.value) {
                o.url += `/?$filter=${encodeURIComponent(countPrm.value)}`;
            }
        }

        return this.ajaxProvider.ajax(o)
            .then(r => {
                let value = <any>r.value;
                if (value && value.value !== void 0) {
                    value = value.value;
                }
        
                if (!inlineCountEnabled && !includeResponse) 
                    return value;

                return { 
                    value: value,
                    inlineCount: inlineCountEnabled ? Number(r.value && r.value['odata.count']) : void 0,
                    response: includeResponse ? r.response : void 0
                };
            });
    }

    createQuery<T extends object>(resource: string): ODataQuery<T, TResponse>;
    createQuery<T extends object>(resource: string, ctor: Ctor<T>): ODataQuery<T, TResponse>;
    createQuery<T extends object>(ctor: Ctor<T>): ODataQuery<T, TResponse>;
    createQuery<T extends object>(resource: string | Ctor<T>, ctor?: Ctor<T>): ODataQuery<T, TResponse> {
        if (typeof resource === 'function') {
            ctor = resource;
            resource = getResource(ctor);
            if (!resource) {
                const r = /class (.*?)\s|\{|function (.*?)[\s|\(]/.exec(ctor.toString());
                resource = r[1] || r[2];
            }
        }
        const query = new ODataQueryProvider(this).createQuery<T>().withOptions({ url: resource });
        return ctor ? <ODataQuery<T>>query.cast(ctor) : query;
    }
}
