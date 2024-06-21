/* tslint:disable:max-classes-per-file */

import { AjaxOptions, AjaxResponse, IAjaxProvider, Value } from "jinqu";
import { oDataResource, ODataService } from "../index";

export class MockRequestProvider implements IAjaxProvider<Response> {
    public options: AjaxOptions;

    constructor(private readonly result = null) {
    }

    public ajax<T>(options: AjaxOptions): PromiseLike<Value<T> & AjaxResponse<Response>> {
        this.options = options;
        const response = { body: this.result } as Response;
        const result = { value: this.result, response };
        return Promise.resolve(result);
    }
}

export class Country implements ICountry {
    public name: string;
}

// tslint:disable-next-line:no-empty-interface
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

// tslint:disable-next-line:no-empty-interface
export interface ICompany extends Company { }

export class CompanyService extends ODataService {

    constructor(provider?: MockRequestProvider) {
        super("api", provider);
    }

    public companies() {
        return this.createQuery<ICompany>("Companies");
    }
}

export function getCountries(): ICountry[] {
    return [
        { name: "Uganda" },
        { name: "Nauru" },
    ];
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
