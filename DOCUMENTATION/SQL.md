# SQL

## Purpose and driver model

`SQL` is S42-Core's promise-based, multi-engine persistence wrapper. It uses
Bun's native `SQL` client for PostgreSQL, MySQL, and SQLite, and exposes the same
CRUD, schema, raw-query, and transaction API to all three adapters.

This class is different from S42-Core's direct [`SQLite`](./SQLITE.md) wrapper:

- `SQL` uses the unified `Bun.SQL` API and supports asynchronous transaction
  callbacks.
- `SQLite` uses the dedicated, synchronous `bun:sqlite` API and exposes its
  lower-level result types.

No npm database driver is installed for either API.

## Constructor

```ts
import { SQL } from 's42-core'

const sql = new SQL({
	type: 'postgres', // 'postgres' | 'mysql' | 'sqlite'
	url: process.env.DATABASE_URL,
	tls: { rejectUnauthorized: true },
})
```

```ts
type TypeSQLConnection = {
	type: 'mysql' | 'postgres' | 'sqlite'
	url?: string
	tls?: Bun.TLSOptions
}
```

Connection behavior:

- PostgreSQL/MySQL with `url`: Bun detects the adapter from the connection URI.
- PostgreSQL/MySQL without `url`: connection defaults are delegated to
  `Bun.SQL` and its environment-variable resolution.
- SQLite: `url` is the filename and defaults to `db.sqlite`; use `:memory:` for
  an in-memory database. The wrapper enables WAL mode before its first query.
- `tls` is passed only to PostgreSQL/MySQL connections.

## Schema methods

### `createTable(tableName, schema)`

```ts
createTable(tableName: string, schema: ColumnDefinition): Promise<boolean>
```

Runs `CREATE TABLE IF NOT EXISTS` and returns `true` after success.

```ts
await sql.createTable('products', {
	id: 'INTEGER PRIMARY KEY',
	name: 'VARCHAR(200) NOT NULL',
	price: 'DECIMAL(12, 2) NOT NULL',
})
```

Table and column names are validated. Each schema value is a trusted raw DDL
fragment; it is uppercased but not parsed or escaped. Never build a schema value
from request input.

### `alterTable(tableName, alterations)`

```ts
alterTable(tableName: string, alterations: string | string[]): Promise<boolean>
```

Prefixes every supplied clause with `ALTER TABLE <tableName>` and executes
clauses sequentially. It returns `true` after every clause succeeds.

```ts
await sql.alterTable('products', [
	'ADD COLUMN sku VARCHAR(80)',
	'RENAME COLUMN price TO unit_price',
])
```

Only `tableName` is identifier-validated. Alteration clauses are intentionally
engine-specific raw DDL and must come from trusted application or migration
code. When an array is used without an enclosing transaction, earlier clauses
can remain applied if a later clause fails; transactional DDL support also
differs by engine.

### `addTableColumns(tableName, changes)`

```ts
addTableColumns(tableName: string, changes: ColumnDefinition): Promise<boolean>
```

Creates one `ADD COLUMN <name> <definition>` alteration per entry and delegates
to `alterTable()`.

```ts
await sql.addTableColumns('products', {
	enabled: 'BOOLEAN DEFAULT TRUE',
	updated_at: 'TIMESTAMP',
})
```

Column names are validated. Definitions are trusted raw DDL fragments.

### `dropColumn(tableName, columnName)`

```ts
dropColumn(tableName: string, columnName: string): Promise<boolean>
```

Runs `ALTER TABLE <tableName> DROP COLUMN <columnName>`. Both identifiers are
validated. The database adapter determines whether the target column can be
dropped and how dependencies are handled.

### `createIndex(tableName, columns, options?)`

```ts
type SQLIndexColumn =
	| string
	| { name: string; order?: 'ASC' | 'DESC' | 'asc' | 'desc' }

type CreateIndexOptions = {
	name?: string
	unique?: boolean
	ifNotExists?: boolean
	concurrently?: boolean
	using?: string
	include?: string[]
	where?: string
}

createIndex(
	tableName: string,
	columns: string | SQLIndexColumn[],
	options?: CreateIndexOptions,
): Promise<void>
```

The original single-column call remains supported:

```ts
await sql.createIndex('products', 'sku')
```

Compound example:

```ts
await sql.createIndex(
	'products',
	[
		{ name: 'tenant_id', order: 'ASC' },
		{ name: 'updated_at', order: 'DESC' },
	],
	{
		name: 'idx_products_tenant_updated',
		unique: false,
		where: 'enabled = TRUE',
	},
)
```

Options:

| Option         | Behavior                                                             |
| -------------- | -------------------------------------------------------------------- |
| `name`         | Explicit index identifier; defaults to `idx_<table>_<columns>`.      |
| `unique`       | Adds `UNIQUE`.                                                       |
| `ifNotExists`  | Defaults to `true` on PostgreSQL/SQLite and `false` on MySQL.        |
| `concurrently` | Adds PostgreSQL `CONCURRENTLY`.                                      |
| `using`        | PostgreSQL/MySQL access method such as `btree` or `hash`.            |
| `include`      | Adds PostgreSQL non-key `INCLUDE` columns.                           |
| `where`        | Adds a PostgreSQL/SQLite partial-index predicate as trusted raw SQL. |

Unsupported option/adapter combinations reject before query execution. Table,
index, key-column, included-column, and access-method identifiers are
validated. The `where` predicate is deliberately raw and must never include
request-controlled text.

PostgreSQL does not allow `CREATE INDEX CONCURRENTLY` inside a transaction;
invoke that form outside `begin()`/`transaction()`.

### `dropTable(tableName)`

```ts
dropTable(tableName: string): Promise<boolean | null>
```

Runs `DROP TABLE IF EXISTS` and currently returns `true`. This is destructive;
the validated table name must still be selected by trusted application code.

### `getAllTables()`

```ts
getAllTables(): Promise<tableInternalSchema[]>
```

Lists user tables using `PRAGMA table_list`, `pg_catalog.pg_tables`, or `SHOW
TABLES`, depending on the configured adapter. PostgreSQL/MySQL results are
normalized to the common table shape where possible.

### `getTableSchema(tableName)`

```ts
getTableSchema(tableName: string): Promise<tableRowSchema[]>
```

Returns normalized column metadata. SQLite exposes its native `PRAGMA
table_info` values. PostgreSQL/MySQL metadata is mapped into the same public
shape; fields unavailable from the current query use fallback values, so this
method is not a complete constraint or index introspection API.

### `validateTableSchema(tableName, expectedSchema)`

```ts
validateTableSchema(
	tableName: string,
	expectedSchema: ColumnDefinition,
): Promise<boolean>
```

Returns whether every key in `expectedSchema` exists in the current table. It
does not compare SQL types, nullability, defaults, keys, or indexes. An empty
expected schema throws `Table schema not defined`.

## Data methods

### `insert(tableName, data)`

```ts
insert(tableName: string, data: KeyValueData): Promise<TypeReturnQuery | null>
```

Inserts one row with bound values. PostgreSQL adds `RETURNING *`; other adapters
use their write metadata. The normalized result is:

```ts
type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
	affectedRows?: number
}
```

`changes` and `affectedRows` contain the same normalized count.
`lastInsertRowId` can be `undefined` when the driver/table does not expose an
`id` or `ID` value.

### `select(options)`

```ts
select<T>({
	tableName,
	columns?,      // default ['*']
	whereClause?,
	sort?,
	limit?,        // default 100
	page?,         // default 1
}): Promise<T[] | null>
```

`page` is one-based and becomes `OFFSET (page - 1) * limit`. A sort value of
`1` produces `ASC`; every other numeric value produces `DESC`.

```ts
const products = await sql.select<{ id: number; name: string }>({
	tableName: 'products',
	columns: ['id', 'name'],
	whereClause: { enabled: true, price: { $gte: 100 } },
	sort: { updated_at: -1 },
	page: 1,
	limit: 20,
})
```

Validate `page` and `limit` as positive, bounded integers at the request
boundary. They are TypeScript numbers but are rendered into generated SQL.

### `selectPaginate(options)`

```ts
selectPaginate<T>({
	tableName,
	page?,         // default 1
	limit?,        // default 10
	columns?,
	whereClause?,
	sort?,
}): Promise<{ data: T[]; total: number; page: number; limit: number }>
```

Runs `select()` followed by `count()` with the same filter. The two statements
are not automatically placed in one transaction, so concurrent writes can
change the count between queries.

### `update(options)` and `updateById(...)`

```ts
update({
	tableName: string
	whereClause: object
	data: KeyValueData
}): Promise<number | null>

updateById(
	tableName: string,
	id: string | number,
	data: KeyValueData,
): Promise<number | null>
```

Values are bound and the return value is the normalized affected-row count.
`updateById()` delegates to `update()` with `{ id }`.

### `delete(tableName, whereClause?)` and `deleteById(...)`

```ts
delete(tableName: string, whereClause?: object): Promise<number | null>
deleteById(tableName: string, id: string | number): Promise<number | null>
```

Returns the normalized affected-row count. Omitting `whereClause` deletes every
row in the table. `deleteById()` delegates to `delete()` with `{ id }`.

### `count(options)`

```ts
count({ tableName, whereClause? }): Promise<number>
```

Runs `COUNT(*)` with the optional Mongo-style filter and returns a JavaScript
number.

## Mongo-style filters

The exported `translateMongoJsonToSql(query)` and all `whereClause` inputs
support:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

Top-level fields are joined with `AND`. Nested logical operators such as `$or`
and `$and` are not implemented. `$in` and `$nin` require arrays. Field names are
validated and values are returned as bound parameters.

## Transactions

### `begin(...)` and `transaction(...)`

```ts
begin<T>(callback: SQLTransactionCallback<T>): Promise<SQLTransactionResult<T>>
begin<T>(
	options: string,
	callback: SQLTransactionCallback<T>,
): Promise<SQLTransactionResult<T>>

// Bun alias with identical overloads
transaction<T>(...): Promise<SQLTransactionResult<T>>
```

Bun starts the transaction, commits when the callback succeeds, and rolls back
when the callback throws or rejects. The callback receives a scoped S42-Core
`SQL` wrapper, not the raw Bun client, so all methods in this document remain
available and execute on the transaction connection.

```ts
const orderId = await sql.begin(async transaction => {
	const inserted = await transaction.insert('orders', {
		customer_id: customerId,
		status: 'pending',
	})

	await transaction.update({
		tableName: 'inventory',
		whereClause: { product_id: productId },
		data: { reserved: true },
	})

	return inserted?.lastInsertRowId
})
```

The optional `options` string is forwarded to Bun/database `BEGIN` without
S42-Core parsing. It is engine-specific trusted configuration: examples include
PostgreSQL `read write` and SQLite `IMMEDIATE`, `DEFERRED`, or `EXCLUSIVE`.

Bun also resolves an array of query promises returned by the callback:

```ts
const results = await sql.transaction(transaction => [
	transaction.insert('audit_log', { action: 'created' }),
	transaction.insert('outbox', { event: 'ORDER.CREATED' }),
])
```

### Atomicity, concurrency, and retries

A transaction makes its statements atomic, but it does not automatically make
an application-level decision exclusive or make a retry idempotent. Put the
invariant in the write predicate and verify the affected-row count instead of
reading first and then issuing an unconditional update:

```ts
await sql.transaction(async transaction => {
	const changed = await transaction.update({
		tableName: 'invitation_codes',
		whereClause: { uuid, used_count: 0 },
		data: { used_count: 1 },
	})

	if (changed !== 1) {
		throw new Error('Invitation code is already used')
	}

	await transaction.insert('code_redemptions', {
		invitation_code_uuid: uuid,
		redeemed_by: userId,
	})
})
```

Concurrent claimants execute the same conditional write, but only the claimant
that changes the expected state may continue. Throwing when `changed !== 1`
rolls back that transaction. Back the invariant with a database constraint as
well, such as a unique index on `code_redemptions.invitation_code_uuid`, and let
a constraint failure abort the transaction.

For invariants that require reading before writing, use an engine-specific lock
such as `SELECT ... FOR UPDATE` through `transaction.executeRaw()`, or an
appropriate transaction isolation option. These mechanisms are not portable to
every adapter; do not assume a plain `SELECT` prevents another transaction from
changing the row.

Every participating query must use the scoped `transaction` wrapper. A call
through the root `sql` instance, including a storage object that retained it,
runs outside this transaction. Pass the scoped wrapper into that storage instead.

Transactions and retries solve different problems. If the database committed
but the caller did not receive the response, a retry can still repeat the
operation; use an idempotency key or deterministic unique key when that outcome
matters. SQL transactions also cannot atomically include Redis, HTTP, or other
external side effects; use an outbox or another explicit coordination pattern.

### `savepoint(...)`

```ts
savepoint<T>(callback: SQLTransactionCallback<T>): Promise<T>
savepoint<T>(name: string, callback: SQLTransactionCallback<T>): Promise<T>
```

`savepoint()` is available only on the scoped wrapper received by a transaction
or savepoint callback. If its callback fails, Bun rolls back to that savepoint
and rethrows. Catch the error inside the outer transaction to continue it.

```ts
await sql.begin(async transaction => {
	await transaction.insert('orders', order)

	try {
		await transaction.savepoint('optional_audit', async savepoint => {
			await savepoint.insert('audit_log', auditRecord)
			throw new Error('discard optional audit')
		})
	} catch {
		// Only the savepoint work was rolled back.
	}

	await transaction.insert('outbox', event)
})
```

### Distributed transactions (2PC)

```ts
beginDistributed<T>(
	name: string,
	callback: SQLTransactionCallback<T>,
): Promise<SQLTransactionResult<T>>

// Alias of beginDistributed
distributed<T>(name: string, callback: SQLTransactionCallback<T>): Promise<...>

commitDistributed(name: string): Promise<void>
rollbackDistributed(name: string): Promise<void>
```

`beginDistributed()` executes phase 1 and leaves a successful transaction
prepared. Complete phase 2 later with exactly one of `commitDistributed()` or
`rollbackDistributed()`. An uncaught callback error causes Bun to roll back.

```ts
await sql.beginDistributed('order_2026_00042', async transaction => {
	await transaction.insert('orders', order)
})

// Later, after the coordinator decides:
await sql.commitDistributed('order_2026_00042')
// or: await sql.rollbackDistributed('order_2026_00042')
```

PostgreSQL implements this with prepared transactions and MySQL with XA
transactions. Database configuration, privileges, recovery, name uniqueness,
and coordinator durability remain application/operations responsibilities.
SQLite does not support distributed transactions; all four distributed wrappers
reject with Bun's adapter error.

## Raw query bypass

### `executeRaw(query, params?)`

```ts
executeRaw<T = unknown>(query: string, params?: any[]): Promise<T>
```

Delegates directly to `Bun.SQL.unsafe()`. It bypasses S42-Core's table/column
validation, filter translation, pagination, schema helpers, and result
normalization. The resolved value is the adapter's native Bun SQL result.

```ts
const rows = await sql.executeRaw<Array<{ id: number; name: string }>>(
	'SELECT id, name FROM products WHERE id = $1',
	[productId],
)
```

Security contract:

- the SQL string must be static or assembled exclusively from trusted code;
- `params` remain bound values and are the only safe place for request data;
- native placeholders are adapter-specific (`$1`, `$2`, ... for PostgreSQL;
  `?` for MySQL/SQLite);
- multi-statement behavior is adapter-specific and must not be assumed portable.

`executeRaw()` is intentionally an escape hatch. Prefer the structured methods
when they can express the query.

## Identifier and raw-fragment safety

Structured methods validate table, column, filter-field, sort, and index
identifiers before interpolation:

- accepted segment: `[A-Za-z0-9_]+`;
- dot-separated qualified names are accepted;
- `*` is accepted only as a projection;
- expressions and aliases such as `COUNT(*) AS total` are rejected.

Filter and write values are bound parameters. These inputs remain deliberately
raw and trusted: `createTable`/`addTableColumns` type definitions,
`alterTable` clauses, `createIndex.where`, transaction option strings, and the
entire `executeRaw` query string.

## Current operational notes

- Test PostgreSQL, MySQL, and SQLite behavior against every engine/version used
  in production; SQL dialects and result metadata differ.
- The class does not currently expose a public connection `close()` method.
- `dropTable()`, `dropColumn()`, `alterTable()`, and unfiltered `delete()` are
  destructive operations even though identifiers are validated.
- `selectPaginate()` performs two separate statements.
- Schema introspection is normalized and intentionally incomplete.
- Parameterized structured methods currently translate generated `?`
  placeholders by splitting the query into a Bun tagged-template call. A
  literal `?` in the same generated SQL text can desynchronize bindings.
  `executeRaw()` does not use this bridge and delegates directly to Bun.

## Bun references

- [Bun SQL documentation](https://bun.sh/docs/runtime/sql)
- [`TransactionSQL.beginDistributed`](https://bun.com/reference/bun/TransactionSQL/beginDistributed)
- [Dedicated `bun:sqlite` documentation](https://bun.sh/docs/runtime/sqlite)
