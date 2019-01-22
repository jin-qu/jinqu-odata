import { AjaxOptions, IAjaxProvider } from 'jinqu';
import { ODataService } from '..';
import { oDataResource } from '../lib/decorators';

export class MockRequestProvider implements IAjaxProvider {

    constructor(private readonly result = null) {
    }

    options: AjaxOptions;

    ajax<T>(options: AjaxOptions) {
        this.options = options;
        return new Promise<T>(resolve => resolve(this.result));
    }
}

export class Country implements ICountry {
    name: string;
}

export interface ICountry extends Country { }

export class City {
    name: string;
    country: Country;
}

@oDataResource('Addresses')
export class Address {
    id: number;
    text: string;
    city: City;
}

@oDataResource('Companies') // this should override
@oDataResource('Company')
export class Company implements ICompany {
    id: number;
    name: string;
    deleted: boolean;
    createDate: Date;
    addresses: Address[];
    address?: Address;
}

export interface ICompany extends Company { }

export class CompanyService extends ODataService {

    constructor(provider?: MockRequestProvider) {
        super('api', provider);
    }

    companies() {
        return this.createQuery<ICompany>('Companies');
    }
}

export function getCountries(): ICountry[] {
    return [
        { name: 'Uganda' },
        { name: 'Nauru' }
    ];
}

export function getCompanies(): ICompany[] {
    return [
        { id: 1, name: 'Netflix', createDate: new Date(), deleted: false, addresses: [] },
        { id: 2, name: 'Google', createDate: new Date(), deleted: false, addresses: [] }
    ];
};
