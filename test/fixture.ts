import { AjaxOptions, IAjaxProvider } from 'jinqu';
import { ODataService } from '..';

export class MockRequestProvider implements IAjaxProvider {

    options: AjaxOptions;

    ajax<T>(options: AjaxOptions) {
        this.options = options;
        return new Promise<T>(resolve => resolve(null));
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

export interface Company {
    id: number;
    name: string;
    deleted: boolean;
    createDate: Date;
    addresses: Address[];
}

export class CompanyService extends ODataService {

    constructor(provider?: MockRequestProvider) {
        super('', provider);
    }

    companies() {
        return this.createQuery<Company>('Companies');
    }
}
