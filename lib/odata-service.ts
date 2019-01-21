import { IAjaxProvider, QueryParameter, IRequestProvider, AjaxOptions, mergeAjaxOptions, InlineCountInfo, Ctor } from "jinqu";
import { FetchProvider } from 'jinqu-fetch';
import { ODataQueryProvider } from "./odata-query-provider";
import { ODataQuery } from "./odata-query";
import { getResource } from "./decorators";

export class ODataService implements IRequestProvider<AjaxOptions>  {

    constructor(private readonly baseAddress = '', private readonly ajaxProvider: IAjaxProvider = new FetchProvider()) {
    }

    static readonly defaultOptions: AjaxOptions = {};

    request<TResult>(params: QueryParameter[], options: AjaxOptions[]): PromiseLike<TResult> {
        const d = Object.assign({}, ODataService.defaultOptions);
        const o = (options || []).reduce(mergeAjaxOptions, d);
        if (this.baseAddress) {
            if (this.baseAddress[this.baseAddress.length - 1] !== '/' && o.url && o.url[0] !== '/') {
                o.url = '/' + o.url;
            }
            o.url = this.baseAddress + (o.url || '');
        }

        params = params || [];
        const countPrm = params.find(p => p.key === '$count');
        if (countPrm) {
            params = params.filter(p => p !== countPrm);
        }

        params = params.concat(o.params || []);
        o.params = [];

        if (params.length) {
            o.url += '?' + params.map(p => `${p.key}=${encodeURIComponent(p.value)}`).join('&');
        }

        if (countPrm) {
            o.url += '/$count';
            if (countPrm.value) {
                o.url += `/?$filter=${encodeURIComponent(countPrm.value)}`;
            }
        }

        return this.ajaxProvider.ajax(o)
            .then(d => {
                const result = (d && d['value']) || d;
                const count = d && d['odata.count'];

                if (result && count) {
                    (result as InlineCountInfo).$inlineCount = Number(count);
                }
                
                return result;
            });
    }

    createQuery<T>(resource: string): ODataQuery<T>;
    createQuery<T>(resource: string, ctor: Ctor<T>): ODataQuery<T>;
    createQuery<T>(ctor: Ctor<T>): ODataQuery<T>;
    createQuery<T>(resource: string | Ctor<T>, ctor?: Ctor<T>): ODataQuery<T> {
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
