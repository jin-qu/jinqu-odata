import { Ctor, IAjaxProvider } from "@jin-qu/jinqu";
import { FetchProvider } from "@jin-qu/fetch";
import { getResource } from "./decorators";
import { ODataQuery } from "./odata-query";
import { ODataOptions, ODataQueryProvider } from "./odata-query-provider";

export interface ODataSettings<TOptions = ODataOptions & RequestInit, TResponse = Response> extends ODataOptions {
    ajaxProvider?: IAjaxProvider<TResponse, TOptions>;
}

export class ODataService<TOptions extends ODataOptions = ODataOptions & RequestInit, TResponse = Response> {
    public readonly settings: ODataSettings;
    private readonly ajaxProvider: IAjaxProvider<TResponse, TOptions>;

    constructor(baseAddress?: string | null, ajaxProvider?: IAjaxProvider<TResponse, TOptions>);
    constructor(settings?: ODataSettings);
    constructor(arg0?: string | ODataSettings, arg1?: IAjaxProvider<TResponse, TOptions>) {
        if (typeof arg0 === "string" || typeof arg1 !== "undefined") {
            this.settings = { $baseAddress: arg0 as string };
            this.ajaxProvider = arg1;
        }
        else if (typeof arg0 === "object") {
            this.settings = arg0;
            this.ajaxProvider = arg1 || arg0.ajaxProvider as any;
        }
        else {
            this.settings = {};
        }
        this.ajaxProvider ??= new FetchProvider() as any;
    }

    public createQuery<T extends object>(resource: string | Ctor<T>): ODataQuery<T, TOptions, TResponse>;
    // eslint-disable-next-line no-dupe-class-members
    public createQuery<T extends object>(resource: string, ctor: Ctor<T>): ODataQuery<T, TOptions, TResponse>;
    // eslint-disable-next-line no-dupe-class-members
    public createQuery<T extends object>(resource: string | Ctor<T>, ctor?: Ctor<T>): ODataQuery<T, TOptions, TResponse> {
        if (typeof resource === "function") {
            ctor = resource;
            resource = getResource(ctor as any);
            if (!resource) {
                const r = /class (.*?)\s|\{|function (.*?)[\s|(]/.exec(ctor.toString());
                resource = r[1] || r[2];
            }
        }

        const options = Object.assign({}, this.settings, { $url: resource });
        const query = new ODataQueryProvider<TOptions, TResponse>(this.ajaxProvider)
            .createQuery<T>()
            .withOptions(options as TOptions);
        return ctor ? query.cast(ctor) as any : query;
    }
}
