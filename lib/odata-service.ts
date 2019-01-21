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

        let countPrm: QueryParameter = null;
        o.params = o.params || [];
        params = params || [];
        params.forEach(p => {
            if (p.key === '$inlinecount') {
                o.params.push({ key: '$count', value: 'true' });
            }
            else if (p.key === '$count') {
                countPrm = p;
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
