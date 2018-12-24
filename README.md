# jinqu-odata - Jinqu OData implementation

[![Build Status](https://travis-ci.org/jin-qu/jinqu-odata.svg?branch=master)](https://travis-ci.org/jin-qu/jinqu-odata)
[![Coverage Status](https://coveralls.io/repos/github/jin-qu/jinqu-odata/badge.svg?branch=master)](https://coveralls.io/github/jin-qu/jinqu-odata?branch=master)	
[![npm version](https://badge.fury.io/js/jinqu-odata.svg)](https://badge.fury.io/js/jinqu-odata)	
<a href="https://snyk.io/test/npm/jinqu-odata"><img src="https://snyk.io/test/npm/jinqu-odata/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/npm/jinqu-odata" style="max-width:100%;"></a>

Written completely in TypeScript.

## Installation
```
npm i jinqu-odata
```

## Usage

We can create a service class for our OData endpoint, or use ODataService directly.
Creating a service type:

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
With below code, we are loading all **Company** resources.

You can use [jinqu Swagger CodeGen](https://github.com/jin-qu/swagger-codegen/) to create TypeScript metadata for your API, if you have **Swagger** integration.

Using ODataService:

```typescript
const service = new ODataService('odata');
const query = service.createQuery<Company>('Companies');
const data = await query.toArrayAsync();
```

## URL Conventions

### filter

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
const result = await query.inlineCount().toArrayAsync();
const inlineCount = result.$inlineCount;
```

## 

## License

jinqu-odata is under the [MIT License](LICENSE).
