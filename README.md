# jinqu-odata - Jinqu OData implementation

[![Build Status](https://travis-ci.org/jin-qu/jinqu-odata.svg?branch=master)](https://travis-ci.org/jin-qu/jinqu-odata)
[![Coverage Status](https://coveralls.io/repos/github/jin-qu/jinqu-odata/badge.svg?branch=master)](https://coveralls.io/github/jin-qu/jinqu-odata?branch=master)	
[![npm version](https://badge.fury.io/js/jinqu-odata.svg)](https://badge.fury.io/js/jinqu-odata)
<a href="https://snyk.io/test/npm/jinqu-odata"><img src="https://snyk.io/test/npm/jinqu-odata/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/npm/jinqu-odata" style="max-width:100%;"></a>

Written completely in TypeScript.

## Installation

```shell
npm i jinqu-odata
```

## Usage

We can create a service class for our OData endpoint, or use ODataService directly.

* Creating a service type:

```typescript
export class CompanyService extends ODataService {

    constructor(provider?: IAjaxProvider) {
        super('odata');
    }

    companies() {
        return this.createQuery<Company>('Companies');
    }
}

const service = new CompanyService();
const data = await service.companies().toArrayAsync();
```

**companies** method will create a query against ***odata/companies*** resource.
With the code above, we are loading all **Company** resources.

You can use [jinqu Swagger CodeGen](https://github.com/jin-qu/swagger-codegen/) to create TypeScript metadata for your API, if you have **Swagger** integration.

* Using ODataService:

```typescript
const service = new ODataService('odata');
const query = service.createQuery<Company>('Companies');
const data = await query.toArrayAsync();
```

## URL Conventions

You should check unit tests for detailed usages, but here are a few samples.

### Filter

```typescript
const result = await query.where(c => c.name.startsWith('Net'));
// odata/Companies?$filter=startsWith(name,"Net")
```

#### Supported Operators

| Name | TypeScript/JavaScript | OData |
| ---- | --------------------- | ----- |
| Equals | ==, === | eq |
| Not Equals | !=, !== | ne |
| Greater Than | > | gt |
| Greater Than or Equal | >= | ge |
| Less Than | < | lt |
| Less Than or Equal | <= | le |
| Logical And | && | and |
| Logical Or | \|\| | or |
| Logical Not | ! | not |
| Arithmetic Add | + | add |
| Arithmetic Subtraction | - | sub |
| Arithmetic Multiplication | * | mul |
| Arithmetic Division | / | div |
| Arithmetic Modulo | % | mod |
| Arithmetic Negation | - | - |

#### Supported Inline Functions

| TypeScript/JavaScript | OData |
| --------------------- | ----- |
| includes | substringof |
| endsWith | endswith |
| startsWith | startswith |
| length | length |
| indexOf | indexof |
| replace | replace |
| substring | substring |
| toLowerCase | tolower |
| toUpperCase | toupper |
| trim | trim |
| concat | concat |
| getMonth | month |
| getDate | day |
| getHours | hour |
| getMinutes | minute |
| getSeconds | second |
| Math.round | round |
| Math.floor | floor |
| Math.ceiling | ceiling |

### inlineCount

```typescript
// enable inline count in query
const result = await query.inlineCount().toArrayAsync();
// get the inline count value
const inlineCount = result.$inlineCount;
```

### Select

We execute the query immediately after a select.

```typescript
const result = await query.select(c => ({ name: c.name }));
```

OData does not allow primitive results (result must be object), so we enforce it:

```typescript
// NOT ALLOWED
const result = await query.select(c => c.name);
```

### OrderBy

Each **orderBy** starts a new ordering, for multiple sort parameters you should use **thenBy** methods.

```typescript
const result = await query.orderBy(c => c.id).thenByDescending(c => c.name).toArrayAsync();
// $orderby=id,name desc
```

### Top and Skip

Below query will **skip** 20 items and load only 10 of them.

```typescript
const result = await query.skip(20).top(10).toArrayAsync();
```

### Expand

jinqu-odata supports expand with selections:

```typescript
const result = await query.expand(c => c.addresses.$expand(a => a.city).country).toArrayAsync();
// $expand=addresses/city/country

const result = query.expand('addresses.city.country').toArrayAsync();
// $expand=addresses/city/country

// with selects
const result = query
    .expand(c => c.addresses, a => a.city)
    .expand(c => c.addresses.$expand(a => a.city), c => c.country)
    .expand(c => c.addresses.$expand(a => a.city).country, c => c.name);
// $expand=addresses($expand=city($expand=country($select=name),$select=country),$select=city)
```

### GroupBy

jinqu-odata supports **GroupBy** with **$apply** convention
(**GroupBy** also cause the execution of query, like **select**):

```typescript
// we group resources by "deleted" field
// and select the count of each group with "deleted" field
const promise = await query.groupBy(
    c => ({ deleted: c.deleted }),
    g => ({ deleted: g.deleted, count: g.count() })
);
```

### Count

To get the count of the resources, you can use the syntax below:

```typescript
const count: number = await query.count();
// Companies/$count will be executed
```

### Executing

To execute a query and get a promise you can call **toArrayAsync**.

```typescript
const result = await query.where(c => c.id > 42).toArrayAsync();
```

## License

jinqu-odata is under the [MIT License](LICENSE).
