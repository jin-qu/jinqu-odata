import { expect } from 'chai';
import 'mocha';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { CompanyService, MockRequestProvider, Address } from './fixture';

chai.use(chaiAsPromised);

describe('Service tests', () => {

    const provider = new MockRequestProvider();
    const service = new CompanyService(provider);

    it('should handle query parameter', async () => {
        const query = service.companies().setParameter('id', 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?id=5`;
        expect(url).equal(expectedUrl);
    });

    it('should handle header (options)', async () => {
        const query = service.companies().withOptions({ headers: { 'Auth': '12345' } });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        expect(provider.options.headers).property('Auth').is.equal('12345');
    });

    it('should handle inline count', async () => {
        const query = service.companies().inlineCount();
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$inlinecount=allpages`;
        expect(url).equal(expectedUrl);
    });

    it('should handle filter parameter', async () => {
        const query = service.companies().where(c => c.id === 4 && c.addresses.any(a => a.id > 2));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent('id eq 4 and addresses/any(a: a/id gt 2)')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle order and then descending parameters', () => {
        const query = service.companies().orderBy(c => c.id).thenByDescending(c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$orderby=${encodeURIComponent('id,name desc')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle select', () => {
        const query = service.companies();
        expect(query.select(c => ({ ID: c.id, NAME: c.name }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$select=${encodeURIComponent('id as ID, name as NAME')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level', () => {
        const query = service.companies().expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 1', () => {
        const query = service.companies().expand('addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 2', () => {
        const query = service.companies().expand('c => c.addresses.city.country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level using strings 3', () => {
        const query = service.companies().expand('c => c.addresses.$expand(a => a.city).country');
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls', () => {
        const query = service.companies()
            .expand(c => c.addresses)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent('addresses/city/country')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls and selects', () => {
        const query = service.companies()
            .expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city), c => c.country)
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = 'addresses($expand=city($expand=country($select=name),$select=country),$select=city)';
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle expand with multi level with explicit calls and mixed selects', () => {
        const query = service.companies()
            .expand(c => c.addresses, a => a.city)
            .expand(c => c.addresses.$expand(a => a.city))
            .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = 'addresses($expand=city/country($select=name),$select=city)';
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle skip and top', async () => {
        const query = service.companies().skip(20).top(10);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies?$skip=20&$top=10';
        expect(url).equal(expectedUrl);
    });

    it('should handle count', () => {
        const query = service.companies();
        expect(query.count()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        expect(url).equal('api/Companies/$count');
    });

    it('should handle count with filter', () => {
        const query = service.companies();
        expect(query.count(c => c.id > 5)).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies/$count/?$filter=${encodeURIComponent('id gt 5')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby', () => {
        const query = service.companies();
        expect(query.groupBy(c => ({ deleted: c.deleted }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = 'api/Companies?$apply=groupby((deleted))';
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby with count aggregation', () => {
        const query = service.companies();
        const promise = query.groupBy(c => ({ deleted: c.deleted }), g => ({ deleted: g.deleted, count: g.count() }));
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$apply=${encodeURIComponent('groupby((deleted), aggregate(deleted, $count as count))')}`;
        expect(url).equal(expectedUrl);
    });

    it('should handle groupby with sum aggregation', () => {
        const query = service.companies();
        const promise = query.groupBy(c => ({ deleted: c.deleted }), g => ({ deleted: g.deleted, sumId: g.sum(x => x.id) }));
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$apply=${encodeURIComponent('groupby((deleted), aggregate(deleted, id with sum as sumId))')}`;
        expect(url).equal(expectedUrl);
    });
});
