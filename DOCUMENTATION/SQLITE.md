# SQLITE

## Purpose

`SQLite` is the direct `bun:sqlite` wrapper. It is separate from the multi-engine
`SQL` class and is intended for embedded, local, or single-node storage.

## Constructor

```ts
import { SQLite } from 's42-core'

const file = new SQLite({ type: 'file', filename: './service.sqlite' })
const memory = new SQLite({ type: 'memory' })
```

`filename` is required when `type` is `file`.

## API

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `dropTable(tableName)`
- `insert(tableName, data)`
- `select(tableName, columns?, whereClause?, sort?, limit?, offset?)`
- `update(tableName, whereClause, data)`
- `delete(tableName, whereClause?)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `close()`

The class does not expose `count`, `selectPaginate`, `updateById`, or
`deleteById`.

## Automatic `added` field

`createTable()` adds `added: integer` to the schema. `insert()` adds the current
timestamp under `added`.

Both methods mutate the object supplied by the caller:

```ts
const schema = { uuid: 'text primary key' }
db.createTable('items', schema)
// schema now also contains added
```

Avoid reusing those objects where mutation would be surprising.

## Filtering and identifier safety

`translateMongoJsonToSql()` is re-exported and supports `$eq`, `$ne`, `$gt`,
`$gte`, `$lt`, `$lte`, `$in`, `$nin`, and `$like`.

Table, column, filter, and sort identifiers use the same strict validation as
`SQL`. `*` is allowed as a projection; expressions and aliases are rejected.
Runtime values use bound parameters.

Schema type strings remain trusted DDL fragments and must not come from request
input.

## Example

```ts
const db = new SQLite({ type: 'memory' })

db.createTable('operators', {
	uuid: 'text primary key',
	email: 'text',
})

db.insert('operators', {
	uuid: crypto.randomUUID(),
	email: 'operator@stock42.com',
})

const rows = await db.select<{ uuid: string; email: string }>(
	'operators',
	['uuid', 'email'],
	{ email: { $like: '%@stock42.com' } },
)
```

## Notes

- `insert()` returns `void`; create/update/delete methods return native
  `bun:sqlite` change objects.
- Validate numeric `limit` and `offset` at the request boundary.
- Call `close()` during graceful shutdown.
