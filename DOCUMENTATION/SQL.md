# SQL

## Purpose

`SQL` provides one CRUD/schema API over PostgreSQL, MySQL, and SQLite.

Drivers:

- PostgreSQL/MySQL: Bun's native `SQL`.
- SQLite: `bun:sqlite`.

## Constructor

```ts
import { SQL } from 's42-core'

const sql = new SQL({
	type: 'postgres', // 'mysql' | 'sqlite'
	url: process.env.DATABASE_URL,
	tls: { rejectUnauthorized: true },
})
```

For SQLite, `url` is the database filename and defaults to `db.sqlite`. Use
`:memory:` for an in-memory database. PostgreSQL/MySQL without `url` use Bun SQL
environment defaults.

## API

Schema:

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `dropTable(tableName)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `validateTableSchema(tableName, expectedSchema)`

Data:

- `insert(tableName, data)`
- `select({ tableName, columns?, whereClause?, sort?, limit?, page? })`
- `selectPaginate({ tableName, columns?, whereClause?, sort?, limit?, page? })`
- `update({ tableName, whereClause, data })`
- `updateById(tableName, id, data)`
- `delete(tableName, whereClause?)`
- `deleteById(tableName, id)`
- `count({ tableName, whereClause? })`

`select()` defaults to `columns: ['*']`, `limit: 100`, and `page: 1`.
`selectPaginate()` defaults to `limit: 10` and returns data plus total count.

## Mongo-style filters

The exported `translateMongoJsonToSql(query)` supports:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

```ts
const products = await sql.select<{ id: number; name: string }>({
	tableName: 'products',
	whereClause: {
		enabled: true,
		price: { $gte: 100 },
	},
	sort: { added: -1 },
	page: 1,
	limit: 20,
})
```

## Identifier and value safety

Table, column, filter-field, and sort identifiers are validated before
interpolation:

- accepted segment: `[A-Za-z0-9_]+`;
- dot-separated qualified names are accepted;
- `*` is accepted as a projection;
- expressions and aliases such as `COUNT(*) AS total` are rejected.

Filter and write values are bound as parameters.

Schema type strings are DDL fragments supplied by trusted application code and
are not identifier-validated. Never build them from request input.

Validate `page` and `limit` as positive, bounded numbers at the request boundary;
they are typed as numbers but rendered into generated SQL.

## Write results

- `insert()` returns `{ lastInsertRowId?, changes, affectedRows }`.
- `update()` / `updateById()` return the affected-row count.
- `delete()` / `deleteById()` return the affected-row count.

`changes` and `affectedRows` contain the same normalized count.
`lastInsertRowId` can be `undefined` when the driver or table does not expose an
`id`/`ID`.

## Current PostgreSQL/MySQL placeholder constraint

The Bun SQL bridge splits the completed query string on `?` to construct a
tagged-template call. A literal question mark inside generated SQL can
desynchronize parameters.

Keep SQL generation inside the provided helpers and do not place literal `?`
characters in trusted schema/type fragments used by those queries. A future
driver abstraction is required to remove this limitation.

## Notes

- Test behavior against every database engine used in production; the drivers
  return different result shapes.
- The class does not currently expose a public connection `close()` method.
- `dropTable()` and `delete()` without a filter are destructive; keep table
  names and filters owned by trusted application code.
