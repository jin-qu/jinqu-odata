import { AjaxOptions, IAjaxProvider } from 'jinqu';
import { ODataService } from '..';

export class MockRequestProvider implements IAjaxProvider {

    constructor(private readonly result = null) {
    }

    options: AjaxOptions;

    ajax<T>(options: AjaxOptions) {
        this.options = options;
        return new Promise<T>(resolve => resolve(this.result));
    }
}

export class Country {
    name: string;
}

export class City {
    name: string;
    country: Country;
}

export class Address {
    id: number;
    text: string;
    city: City;
}

export interface ICompany {
    id: number;
    name: string;
    deleted: boolean;
    createDate: Date;
    addresses: Address[];
}

export class Company implements ICompany {
    id: number;
    name: string;
    deleted: boolean;
    createDate: Date;
    addresses: Address[];
}

export class CompanyService extends ODataService {

    constructor(provider?: MockRequestProvider) {
        super('api', provider);
    }

    companies() {
        return this.createQuery<ICompany>('Companies');
    }
}

export function getCompanies(): ICompany[] {
    return [
        { id: 1, name: 'Netflix', createDate: new Date(), deleted: false, addresses: [] },
        { id: 2, name: 'Google', createDate: new Date(), deleted: false, addresses: [] }
    ];
};
