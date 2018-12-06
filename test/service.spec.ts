import { expect } from 'chai';
import 'mocha';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { CompanyService, MockRequestProvider, Address } from './fixture';

chai.use(chaiAsPromised);

describe('Service tests', () => {

    const provider = new MockRequestProvider();
    const service = new CompanyService(provider);

    it('should create filter parameter', () => {
        const query = service.companies().where(c => c.id === 4 && c.addresses.any(a => a.id > 2));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$filter');
        expect(prm).property('value').to.equal('id eq 4 and addresses/any(a: a/id gt 2)');
    });

    it('should create order and then descending parameters', () => {
        const query = service.companies().orderBy(c => c.id).thenByDescending(c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$orderby');
        expect(prm).property('value').to.equal('id,name desc');
    });

    it('should create expand with multi level', () => {
        const query = service.companies().expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses/city/country');
    });

    it('should create expand with multi level using strings 1', () => {
        const query = service.companies().expand('addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses/city/country');
    });

    it('should create expand with multi level using strings 2', () => {
        const query = service.companies().expand('c => c.addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses/city/country');
    });

    it('should create expand with multi level using strings 3', () => {
        const query = service.companies().expand('c => c.addresses.$expand(a => a.city).country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses/city/country');
    });

    it('should create expand with multi level with explicit calls', () => {
        const query = service.companies().expand(c => c.addresses)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses/city/country');
    });

    it('should create expand with multi level with explicit calls and selects', () => {
        const query = service.companies().expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city), c => c.country)
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses($expand=city($expand=country($select=name),$select=country),$select=city)');
    });

    it('should create expand with multi level with explicit calls and mixed selects', () => {
        const query = service.companies().expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;
        expect(provider).property('options').property('params').to.have.length(1);

        const prm = provider.options.params[0];
        expect(prm).property('key').to.equal('$expand');
        expect(prm).property('value').to.equal('addresses($expand=city/country($select=name),$select=city)');
    });
});
