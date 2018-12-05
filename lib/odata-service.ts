import { IAjaxProvider, QueryParameter, IRequestProvider, AjaxOptions, mergeAjaxOptions } from "jinqu";
import { FetchProvider } from 'jinqu-fetch';
import { ODataQueryProvider } from "./odata-query-provider";

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
        o.params = (params || []).concat(o.params || []);

        return this.ajaxProvider.ajax(o);
    }

    createQuery<T>(url: string) {
        return new ODataQueryProvider(this).createQuery<T>().withOptions({ url });
    }
}
