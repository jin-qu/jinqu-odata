/* tslint:disable:no-unused-expression */

import { expect } from "chai";
import chai = require("chai");
import chaiAsPromised = require("chai-as-promised");
import { PartArgument, QueryPart } from "jinqu";
import "jinqu-array-extensions";
import "mocha";

import { ODataQuery, ODataQueryProvider, ODataService } from "../index";
import { ODataFuncs } from "../lib/shared";
import { Company, CompanyService, Country, getCompanies, getCompany, ICompany, ICountry, MockRequestProvider } from "./fixture";

chai.use(chaiAsPromised);

describe("Service tests", () => {

    const provider = new MockRequestProvider();
    const service = new CompanyService(provider);

    it("should create with default parameters", async () => {
        const svc = new ODataService();
        expect(svc).to.not.null;
    });

    it("should throw for sync execution", async () => {
        const svc = new ODataQueryProvider(service);
        expect(() => svc.execute([])).to.throw();
    });

    it("should throw for unknown part", async () => {
        const svc = new ODataQueryProvider(service);
        expect(() => svc.executeAsync([{ type: "UNKNOWN", args: [], scopes: [] }])).to.throw();
    });

    it("should throw for unsupported expression", async () => {
        const query = service.companies().where((c) => c.name[1] === "a");
        expect(() => query.toArrayAsync()).to.throw();
    });

    it("should throw for invalid callee", () => {
        const query = service.companies().where("c => c.id.toString()() == 1");
        expect(() => query.toArrayAsync()).to.throw();
    });

    it("should throw for invalid thenExpand", async () => {
        const part = new QueryPart(ODataFuncs.thenExpand, [
            PartArgument.literal("fail"),
            PartArgument.literal(null),
            PartArgument.literal(null),
        ]);
        const query = service.companies().provider.createQuery([part]) as ODataQuery<Company>;
        expect(() => query.toArrayAsync()).to.throw();
    });

    it("should handle missing parameters", async () => {
        const svc = new ODataService(null, provider);
        expect(svc.request(null, null)).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        expect(url).is.undefined;
    });

    it("should handle base address", async () => {
        const svc1 = new ODataService("", provider);
        const query1 = svc1.createQuery<ICompany>("Companies");
        expect(query1.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url1 = provider.options.url;
        expect(url1).equal("Companies");

        const svc2 = new ODataService("api/", provider);
        const query2 = svc2.createQuery<ICompany>("Companies");
        expect(query2.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url2 = provider.options.url;
        expect(url2).equal("api/Companies");

        const svc3 = new ODataService("api/", provider);
        const query3 = svc3.createQuery<ICompany>("");
        expect(query3.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url3 = provider.options.url;
        expect(url3).equal("api/");
    });

    it("should handle empty request", async () => {
        const query = service.companies();
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = "api/Companies";
        expect(url).equal(expectedUrl);
    });

    it("should handle header (options)", async () => {
        const query = service.companies().withOptions({ headers: { Auth: "12345" } });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        expect(provider.options.headers).property("Auth").is.equal("12345");
    });

    it("should handle query parameter", async () => {
        const query = service.companies().setParameter("id", 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = "api/Companies?id=5";
        expect(url).equal(expectedUrl);
    });

    it("should handle inlineCount", async () => {
        const value1 = [];
        const result1 = { "@odata.count": 100, "value": value1 };
        const prv1 = new MockRequestProvider(result1);
        const query1 = new CompanyService(prv1).companies().inlineCount();
        const response1 = await query1.toArrayAsync();
        const url1 = prv1.options.url;
        const expectedUrl1 = `api/Companies?$count=true`;
        expect(url1).equal(expectedUrl1);
        expect(response1.value).eq(value1);
        expect(response1.inlineCount).eq(100);

        const value2 = [];
        const result2 = { value: value2 };
        const prv2 = new MockRequestProvider(result2);
        const query2 = new CompanyService(prv2).companies().inlineCount();
        const response2 = await query2.toArrayAsync();
        const url2 = prv2.options.url;
        const expectedUrl2 = `api/Companies?$count=true`;
        expect(url2).equal(expectedUrl2);
        expect(response2.value).eq(value2);
        expect(response2.inlineCount).is.NaN;
    });

    it("should includeResponse", async () => {
        const value = [];
        const prv = new MockRequestProvider(value);
        const query = new CompanyService(prv).companies().includeResponse();
        const response = await query.toArrayAsync();
        const url = prv.options.url;
        const expectedUrl = `api/Companies`;
        expect(url).equal(expectedUrl);
        expect(response.value).eq(value);
        expect(response.response).property("body").eq(value);
    });

    it("should handle filter parameter", async () => {
        const query = service.companies()
            .where((c) => c.id === 4 && (!c.addresses.any((a) => a.id > 1000) || c.addresses.all((a) => a.id >= 1000)));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "id eq 4 and (not addresses/any(a: a/id gt 1000) or addresses/all(a: a/id ge 1000))";
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle string filter parameter", async () => {
        const query = service.companies()
            .where("c => c.id === 4 && (!c.addresses.any(a => a.id > 1000) || c.addresses.all(a => a.id >= 1000))");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "id eq 4 and (not addresses/any(a: a/id gt 1000) or addresses/all(a: a/id ge 1000))";
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle string filter parameter without lambda", async () => {
        const query = service.companies().where("id === 4");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("id eq 4")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle filter parameter with zero value", async () => {
        const val = 0;
        const query = service.companies().where("c => c.id >= val", { val });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("id ge 0")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle order and then descending parameters", () => {
        const query = service.companies().orderBy((c) => c.id).thenByDescending((c) => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$orderby=${encodeURIComponent("id,name desc")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle order descending and then ascending parameters", () => {
        const query = service.companies().orderByDescending((c) => c.id).thenBy((c) => c.name);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$orderby=${encodeURIComponent("id desc,name")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle select", () => {
        const query = service.companies()
            .select("id", "name");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$select=${encodeURIComponent("id,name")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle expand with multi level", () => {
        const q = service.companies();
        q.expand("addresses", ["city", "id"]);

        const query = service.companies()
            .expand("addresses")
            .thenExpand("city")
            .thenExpand("country");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent("addresses($expand=city($expand=country))")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle expand with multi level with repeated calls", () => {
        const options = { city: "Gotham" };
        const id = 42;
        const query = service.companies()
            .expand("addresses", ["city"])
            .expand("addresses", (a) => a.id > id, { id })
            .thenExpand("city", (c) => c.name === options.city, { options })
            .thenExpand("country");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "addresses($filter=id gt 42;$expand=city($filter=name eq 'Gotham';$expand=country))";
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle expand with multi level with repeated calls and selects", () => {
        const query = service.companies()
            .expand("addresses")
            .expand("addresses", ["city"])
            .thenExpand("city", ["country"])
            .thenExpand("country", ["name"], (c) => c.name !== "Gilead");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm =
            "addresses($select=city;$expand=city($select=country;" +
            "$expand=country($filter=name ne 'Gilead';$select=name)))";
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle expand with multi level with repeated calls and deep expands with selects", () => {
        const query = service.companies()
            .expand("addresses", ["city"])
            .thenExpand("city")
            .thenExpand("country", ["name"]);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "addresses($select=city;$expand=city($expand=country($select=name)))";
        const expectedUrl = `api/Companies?$expand=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle skip and top", async () => {
        const query = service.companies().skip(20).take(10);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = "api/Companies?$skip=20&$top=10";
        expect(url).equal(expectedUrl);
    });

    it("should handle count", () => {
        const query = service.companies();
        expect(query.count()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        expect(url).equal("api/Companies/$count");
    });

    it("should handle count with filter", () => {
        const query = service.companies();
        expect(query.count((c) => c.id > 5)).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies/$count/?$filter=${encodeURIComponent("id gt 5")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle groupby", () => {
        const query = service.companies();
        expect(query.groupBy((c) => ({ deleted: c.deleted }))).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = "api/Companies?$apply=groupby((deleted))";
        expect(url).equal(expectedUrl);
    });

    it("should handle groupby with count aggregation", () => {
        const query = service.companies();
        const promise = query.groupBy(
            (c) => ({ deleted: c.deleted, addresses: c.addresses }),
            (g) => ({ deleted: g.deleted, addressCount: g.addresses.count(), count: g.count() }),
        );
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm =
            "groupby((deleted,addresses),aggregate(deleted,addresses/$count as addressCount,$count as count))";
        const expectedUrl = `api/Companies?$apply=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle groupby with sum aggregation", () => {
        const query = service.companies();
        const promise = query.groupBy(
            (c) => ({ deleted: c.deleted }),
            (g) => ({ deleted: g.deleted, sumId: g.sum((x) => x.id) }),
        );
        expect(promise).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl =
            `api/Companies?$apply=${encodeURIComponent("groupby((deleted),aggregate(deleted,id with sum as sumId))")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle length", async () => {
        const query = service.companies().where((c) => c.name.length < 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("length(name) lt 5")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle round function", async () => {
        const query = service.companies().where((c) => Math.round(c.id) <= 5);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("round(id) le 5")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle substringof function", async () => {
        const query = service.companies().where((c) => c.name.includes("flix"));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("contains(name,'flix')")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle substr function", async () => {
        const query = service.companies().where((c) => c.name.substr(0, 2) === "Ne");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("substring(name,0,2) eq 'Ne'")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle lower function", async () => {
        const query = service.companies().where((c) => c.name.toLowerCase() === "netflix");
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("tolower(name) eq 'netflix'")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle startsWith function", async () => {
        const query = service.companies().where((c) => c.name.startsWith("Net"));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("startswith(name,'Net')")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle date", async () => {
        const date = new Date(1592, 2, 14);
        const query = service.companies().where((c) => c.createDate < date && c.name != null, { date });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = `createDate lt datetime'${date.toISOString()}' and name ne null`;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle other operators", async () => {
        const query = service.companies()
            .where((c) => ((c.id + 4 - 2) * 4 / 2) % 2 === 1 && c.id !== 42 && -c.id !== 19);
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "((id add 4 sub 2) mul 4 div 2) mod 2 eq 1 and id ne 42 and -id ne 19";
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);

        const expectedQuery = `$filter=${expectedPrm}`;
        expect(query.toString()).equal(expectedQuery);
    });

    it("should handle chained filters", async () => {
        const query = service.companies().where(c => c.id >= 27).where(c => c.name.startsWith("Net"));
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedPrm = "id ge 27 and startswith(name,'Net')";
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent(expectedPrm)}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle cast", async () => {
        const prv = new MockRequestProvider(getCompanies());
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICompany>("Companies").cast(Company).toArrayAsync();

        result.forEach((r) => expect(r).to.be.instanceOf(Company));
    });

    it("should handle cast via createQuery", async () => {
        const prv = new MockRequestProvider(getCompanies());
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICompany>("Companies", Company).toArrayAsync();

        result.forEach((r) => expect(r).to.be.instanceOf(Company));
    });

    it("should handle cast via createQuery with decorator", async () => {
        const prv = new MockRequestProvider(getCompanies());
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICompany>(Company).toArrayAsync();

        expect(prv.options.url).equal("api/Companies");
        result.forEach((r) => expect(r).to.be.instanceOf(Company));
    });

    it("should handle cast via createQuery without decorator", async () => {
        const prv = new MockRequestProvider(getCompanies());
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICountry>(Country).toArrayAsync();

        expect(prv.options.url).equal("api/Country");
        result.forEach((r) => expect(r).to.be.instanceOf(Country));
    });

    it("should handle cast via toArrayAsync", async () => {
        const prv = new MockRequestProvider({ value: getCompanies() });
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICompany>("Companies").toArrayAsync(Company);

        result.forEach((r) => expect(r).to.be.instanceOf(Company));
    });

    it("should handle cast via toArrayAsync with inlineCount", async () => {
        const prv = new MockRequestProvider({ value: getCompanies() });
        const svc = new ODataService("api", prv);
        const result = await svc.createQuery<ICompany>("Companies").inlineCount().toArrayAsync(Company);

        result.value.forEach((r) => expect(r).to.be.instanceOf(Company));
    });

    it('should handle boolean parameters', () => {
        const query = service.companies()
            .where('c => c.deleted === boolVar', { boolVar: false });
        expect(query.toArrayAsync()).to.be.fulfilled.and.eventually.be.null;

        const url = provider.options.url;
        const expectedUrl = `api/Companies?$filter=${encodeURIComponent("deleted eq false")}`;
        expect(url).equal(expectedUrl);
    });

    it("should handle byKey(single)", async () => {
        const value = getCompany();
        const result = Object.assign({}, { "@odata.context": "ctx" }, value);
        const prv = new MockRequestProvider(result);
        const query1 = new CompanyService(prv).companies().byKey(5);
        const response1 = await query1.singleAsync();
        const url1 = prv.options.url;
        const expectedUrl1 = "api/Companies(5)";
        expect(url1).equal(expectedUrl1);
        expect(response1).to.deep.equal(value);

        const query2 = service.companies().byKey("id5");
        expect(query2.singleAsync()).to.be.fulfilled.and.eventually.be.null;
        const url2 = provider.options.url;
        const expectedUrl2 = "api/Companies('id5')";
        expect(url2).equal(expectedUrl2);
    });

    it("should handle byKey({composite})", async () => {
        const query1 = service.companies().byKey({ id: 7, name: "Microsoft" });
        expect(query1.singleAsync()).to.be.fulfilled.and.eventually.be.null;
        const url1 = provider.options.url;
        const expectedUrl1 = "api/Companies(id=7,name='Microsoft')";
        expect(url1).equal(expectedUrl1);
    });

    it("should throw for invalid composite key", async () => {
        const query2 = service.companies().byKey({ id: 7 });
        expect(() => query2.singleAsync()).to.throw();
    });
});
