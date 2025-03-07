import { AjaxResponse, IAjaxProvider, Value } from "@jin-qu/jinqu";
import { ODataOptions, oDataResource, ODataService } from "../index";

export class MockRequestProvider implements IAjaxProvider<Response, RequestInit & ODataOptions> {
    public options: ODataOptions;

    constructor(private readonly result = null) {
    }

    public ajax<T>(options: ODataOptions): PromiseLike<Value<T> & AjaxResponse<Response>> {
        this.options = options;
        const response = { body: this.result } as Response;
        const result = { value: this.result, response };
        return Promise.resolve(result);
    }
}

export class Country implements ICountry {
    public name: string;
}

export interface ICountry extends Country { }

export class City {
    public name: string;
    public country: Country;
}

@oDataResource("Addresses")
export class Address {
    public id: number;
    public text: string;
    public city: City;
}

@oDataResource("Companies") // this should override
@oDataResource("Company")
export class Company implements ICompany {
    public id: number;
    public name: string;
    public deleted: boolean;
    public createDate: Date;
    public addresses: Address[];
    public address?: Address;
}

export interface ICompany extends Company { }

export class CompanyService extends ODataService {

    constructor(provider?: MockRequestProvider) {
        super("api", provider);
    }

    public companies() {
        return this.createQuery<ICompany>("Companies");
    }
}

export function getCompanies(): ICompany[] {
    return [
        { id: 1, name: "Netflix", createDate: new Date(), deleted: false, addresses: [] },
        { id: 2, name: "Google", createDate: new Date(), deleted: false, addresses: [] },
    ];
}

export function getCompany(): ICompany {
    return { id: 3, name: "IBM", createDate: new Date(), deleted: false, addresses: [
        { id: 1, text: "nice", city: { name: "NY", country: { name: "USA" } } }
    ] };
}
