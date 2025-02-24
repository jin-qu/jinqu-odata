# jinqu-odata - Javascript-Linq to Odata

[![Build and Test](https://github.com/jin-qu/jinqu-odata/actions/workflows/build.yml/badge.svg)](https://github.com/jin-qu/jinqu-odata/actions/workflows/build.yml)
[![codecov](https://codecov.io/gh/jin-qu/jinqu-odata/graph/badge.svg?token=Mqp29YJENK)](https://codecov.io/gh/jin-qu/jinqu-odata)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/57901c8caa8848a596b2274f5700f0c6)](https://app.codacy.com/gh/jin-qu/jinqu-odata/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
<a href="https://snyk.io/test/npm/@jin-qu/odata"><img src="https://snyk.io/test/npm/@jin-qu/odata/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/npm/@jin-qu/odata" style="max-width:100%;"></a>

[![npm version](https://img.shields.io/npm/v/@jin-qu/odata)](https://www.npmjs.com/package/@jin-qu/odata)
[![npm downloads](https://img.shields.io/npm/dm/@jin-qu/odata.svg)](https://www.npmjs.com/package/@jin-qu/odata)

[![GitHub issues](https://img.shields.io/github/issues/jin-qu/jinqu-odata.svg)](https://github.com/jin-qu/jinqu-odata/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/jin-qu/jinqu-odata/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/jin-qu/jinqu-odata.svg?style=social&label=Star)](https://github.com/jin-qu/jinqu-odata)
[![GitHub forks](https://img.shields.io/github/forks/jin-qu/jinqu-odata.svg?style=social&label=Fork)](https://github.com/jin-qu/jinqu-odata)

Jinqu-odata lets you write LINQ queries against an odata source. For those who don't know LINQ, the benefits are:

* A unified query language, whether querying local arrays, odata sources, or any other remote data source
* Static typing where Typescript can verify your query is sound

jinqu-odata is dependent on the [jinqu](https://github.com/jin-qu/jinqu) package.

## Installation

```shell
npm install jinqu-odata
```

## Usage

First, we need classes that map to our odata resources. For example:

```typescript
@oDataResource('Books')
export class Book {
    Id: number
    Title: string
}
```

We can now query filtered books as follows:

```typescript
const service = new ODataService ("https://www.solenya.org/odata")

const books = await service
    .createQuery(Book)
    .where(b => b.Price > 60)
    .toArrayAsync()

for (var b of books)
    console.log (b)
```

You can play with the live sample [here](https://stackblitz.com/edit/jinqu)

The query is translated to the following odata url:

```shell
https://www.solenya.org/odata/Books?$filter=Price gt 60
```

## Inheriting from ODataService

A common pattern is to inherit from `ODataService` to provide stubs for your odata resources as follows:

```typescript
export class CompanyService extends ODataService {

    constructor (provider?: IAjaxProvider) {
        super('odata')
    }

    companies() {
        return this.createQuery(Company)
    }
}
```

## Code Generation

Currently we don't have code generators for jinqu-odata. However, we're actively considering this feature and it's tracked by this github issue:

[https://github.com/jin-qu/jinqu-odata/issues/5](https://github.com/jin-qu/jinqu-odata/issues/5)

## LINQ to OData Translation

jinqu-odata translates LINQ queries to OData Version 4 query strings. In the quries that follow, translations are shown as comments. You can check the unit tests for more thorough coverage of the translations.

### Where

To filter results we use the `where` operator:

```typescript
const result = await query
    .where(c => c.name.startsWith('Net'))
    .toArrayAsync()

// odata/Companies?$filter=startsWith(name, "Net")
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

### Select

The `select` operator lets us select only a subset of the fields of a type. It can only occur as the last operator in a query, so must be awaited:

```typescript
const result = await query.select("name")

// $select=name
```

### OrderBy

The `orderBy` operator, optionally followed by some `thenBy` operators, specifies result order:

```typescript
const result = await query
    .orderBy(c => c.category)
    .thenByDescending(c => c.created).toArrayAsync()

// $orderby=category,created desc
```

### Count

To get the count of a resource:

```typescript
const count = await query.count()

// Companies/$count will be executed
```

### Skip and Take

We can skip a number of items, or limit the number of items, by calling `skip` and `take`. Here we query for the 3rd page in a result, by skipping the first 20 results, and then returning the top 10 of the remaining results:

```typescript
const result = await query.skip(20).take(10).toArrayAsync()

// $skip=20&$top=10
```

### InlineCount

We can use the `inlineCount` operator to include the `inlineCount` property on the results. This will cause query to wrap result.

```typescript
const result = await query.inlineCount().toArrayAsync()
const value = result.value
const inlineCount = result.inlineCount // only populated if inlineCount operator was called
```

This is useful in the preceding `skip/take` scenario, where to implement paging, we'd like the result to include a total non-paged count, without having to write a separate query. Just add the `inlineCount` operator before calling `skip/take`.

### Expand

jinqu-odata supports expand, which enables you to pull in related entities. In this example, we don't merely want to return books; we also want to return the press associated with each book. We can do this as follows:

```typescript
const companies = await service
    .createQuery(Book)
    .expand("Press")
    .toArrayAsync()

// books$expand=Press
```

### Nested Expand

Sometimes we want to drill down more than one level. In this example, our odata source has `books`, where we want to return all the authors for some books. However, since books can have multiple authors, there's a join table between Authors and Books. Our model will mirror the odata metadata as follows:

```typescript
@oDataResource('Books')
export class Book {
    Title: string
    @Type(() => AuthorBook) AuthorBooks: AuthorBook[]
}

export class AuthorBook {
    @Type(() => Author) Author: Author
}

export class Author {
    Name: string
}
```

To query, we first `expand` the `AuthorBooks` property, and `thenExpand` the `Book` property, as follows:

```typescript
const books = await service
    .createQuery(Book)
    .expand("AuthorBooks")
    .thenExpand("Author")
    .toArrayAsync()

// books?$expand=AuthorBooks($expand=Author)
```

#### Filtering Expand by Rows and Columns

For efficiency, we can **filter by rows** an `expand`/`thenExpand` query by providing a predicate:

```
.thenExpand("Author") // no filter
.thenExpand("Author", a => a.endsWith("Albahari")) // filtered

// books?$expand=AuthorBooks($expand=Author($filter=endswith(Name,'Albahari')))
```

Similarly, for efficiency, we can **filter by columns** an `expand`/`thenExpand` query by providing an array of column names:

```
.thenExpand("Author") // no filter
.thenExpand("Author", ["Name"]) // filtered columns

// books?$expand=AuthorBooks($expand=Author($select=Name))
```

#### Deserialization

The `@Type` decorators belong to the `class-transformer` library that handles deserialization. We need those annotations since the typescript types aren't actually available at runtime. The `class-transformer` library imposes the small design restriction on us that any constructor arguments to our classes are optional.

### GroupBy

`groupBy` lets you group results by a particular property. Like `select`, it can only be used as the last operator in a query, and must therefore be awaited:

```typescript
// we group resources by "deleted" field
// and select the count of each group with "deleted" field
const promise = await query.groupBy(
    c => ({ deleted: c.deleted }),
    g => ({ deleted: g.deleted, count: g.count() })
)

// $apply=groupby((deleted),aggregate(deleted,$count as count))
```

As you can see in the translation, jinqu-odata supports `groupBy` with the `$apply` convention.

## Old Browsers

jinqu-odata uses jinqu as a querying platform, if you want to use jinqu features with old browsers, please refer to [jinqu documentation](https://github.com/jin-qu/jinqu#readme).

## License

jinqu-odata is licensed under the [MIT License](LICENSE).
