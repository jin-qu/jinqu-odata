import { expect } from 'chai';
import 'mocha';
import chai = require('chai');
import chaiAsPromised = require('chai-as-promised');
import { CompanyService, MockRequestProvider } from './fixture';

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
        expect(prm).property('value').to.equal('id, name desc');
    });
});
