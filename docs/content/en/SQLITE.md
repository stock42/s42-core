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

## Errors

Query and schema driver failures use the same public `SQLError` and
`isSQLError()` contract as the multi-engine `SQL` class. `message`,
`nativeCode`, `errno`, and `cause` preserve the original `bun:sqlite` details;
`code` contains S42-Core's portable category or `unknown`.

```ts
try {
	db.insert('operators', duplicateOperator)
} catch (error) {
	if (isSQLError(error, 'unique_violation')) {
		// Verify the existing row before treating it as an idempotent replay.
	}
}
```

SQLite exposes extended constraint codes, so unique, foreign-key, not-null, and
check violations can be classified without parsing messages. Duplicate column
and table errors use generic `SQLITE_ERROR` and therefore remain `unknown`.
Validation errors stay as ordinary `Error` instances. Query text and bound
parameters are never attached to the normalized error.

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

`translateMongoJsonToSql()` is re-exported and shares the `SQL` filter grammar:
`$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$like`, inclusive
`$between`, and recursive `$and`, `$or`, and `$not` groups. Direct `null` and
`$eq: null` use `IS NULL`; `$ne: null` uses `IS NOT NULL`. Empty membership
arrays and arrays containing null are normalized without emitting invalid or
three-valued `IN` expressions.

Table, column, filter, and sort identifiers use the same strict validation as
`SQL`. `*` is allowed as a projection; expressions and aliases are rejected.
Runtime values use bound parameters. Empty operator objects, invalid operands,
and empty logical groups throw before query execution. The direct `SQLite` class
does not expose `SQL.executeRaw()`; use the multi-engine `SQL` class when an
engine-specific raw-query escape hatch is required.

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
