# SQL

## Purpose and driver model

`SQL` is S42-Core's promise-based, multi-engine persistence wrapper. It uses
Bun's native `SQL` client for PostgreSQL, MySQL, and SQLite, and exposes the same
CRUD, schema, raw-query, and transaction API to all three adapters.

`SQL` is a focused execution helper, not an ORM. It does not model relations,
entities, query plans, or every engine feature. Structured methods cover common
operations; `executeRaw()` keeps engine-specific SQL available without adding
an ORM-style abstraction.

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
	max: 20,
	connectionTimeout: 10,
	idleTimeout: 30,
	maxLifetime: 3600,
	connection: {
		statement_timeout: 15_000,
		lock_timeout: 5_000,
		application_name: 's42-api',
	},
})
```

```ts
type TypeSQLConnection = {
	type: 'mysql' | 'postgres' | 'sqlite'
	url?: string
	tls?: Bun.TLSOptions
	max?: number
	connectionTimeout?: number
	idleTimeout?: number
	maxLifetime?: number
	connection?: Record<string, string | number | boolean>
}
```

Connection behavior:

- PostgreSQL/MySQL with `url`: Bun detects the adapter from the connection URI.
- PostgreSQL/MySQL without `url`: connection defaults are delegated to
  `Bun.SQL` and its environment-variable resolution.
- SQLite: `url` is the filename and defaults to `db.sqlite`; use `:memory:` for
  an in-memory database. The wrapper enables WAL mode before its first query.
- `tls` is passed only to PostgreSQL/MySQL connections.

### Pool, timeout, and session configuration

S42-Core forwards Bun's native option names without adding a second pool or
retry layer:

| Option              | Engines          | Bun contract                                                               |
| ------------------- | ---------------- | -------------------------------------------------------------------------- |
| `max`               | PostgreSQL/MySQL | Maximum number of connections in the native pool.                          |
| `connectionTimeout` | PostgreSQL/MySQL | Maximum seconds to wait while establishing a connection.                   |
| `idleTimeout`       | PostgreSQL/MySQL | Bun's native pool idle timeout, in seconds.                                |
| `maxLifetime`       | PostgreSQL/MySQL | Maximum lifetime of a connection, in seconds.                              |
| `connection`        | PostgreSQL       | Client runtime parameters sent when each PostgreSQL connection is created. |

The four numeric options are passed directly to Bun and use Bun's seconds-based
input contract, including Bun's runtime semantics for `idleTimeout`. Omitting
them preserves Bun's defaults. SQLite has one native
database connection per `SQL` instance rather than a PostgreSQL/MySQL pool, so
providing any of these pool/session options with `type: 'sqlite'` throws during
construction. Providing `connection` for MySQL also throws instead of silently
ignoring PostgreSQL-only configuration.

`connection` is the engine-level escape hatch for PostgreSQL session defaults.
For example, `statement_timeout: 15_000` and `lock_timeout: 5_000` above use
PostgreSQL's millisecond default for numeric values and apply to every new pool
connection. Keep these values in trusted application configuration.

Pool sizing and `connectionTimeout` do **not** bound an executing query. For
PostgreSQL, use `statement_timeout` (or a database/role-level equivalent) when
the database must cancel slow statements. S42-Core does not implement a generic
query timeout with `Promise.race`, because that would return control while the
database query continues occupying its connection. It also does not retry SQL
operations automatically; retry complete, explicitly idempotent operations or
transactions at the application boundary.

## Connection lifecycle

Construction remains lazy for backwards compatibility. Call `connect()` when
startup must fail fast on an invalid endpoint, TLS setup, or credentials.

```ts
type SQLCloseOptions = {
	timeout?: number
}

connect(): Promise<this>
ping(): Promise<void>
close(options?: SQLCloseOptions): Promise<void>
end(options?: SQLCloseOptions): Promise<void>
```

```ts
const sql = new SQL(config)

await sql.connect()
await sql.ping()

// During shutdown, after stopping and draining the HTTP server:
await sql.close({ timeout: 10 })
```

- `connect()` delegates to Bun's native connection establishment, initializes
  the wrapper's SQLite WAL state, and returns the same S42-Core `SQL` instance.
  It establishes a usable connection; it does not pre-open every pool slot.
- `ping()` performs a real `SELECT 1` round trip. It may be called without a
  preceding `connect()` because Bun remains lazy.
- `close()` delegates to Bun's connection/pool shutdown. With no options it
  waits for pending queries; `timeout` is measured in seconds, and `0` closes
  immediately.
- `end()` is an exact alias of `close()`.

Driver failures from all four methods use the public `SQLError` contract;
`ping()` does not convert failures into `false`. S42-Core does not retry
connections automatically. After `close()`/`end()`, treat the instance as
terminal and construct another `SQL` object if a new lifecycle is required.

Transaction-scoped clients reject `connect()`, `ping()`, `close()`, and `end()`
before touching the driver. Lifecycle operations belong to the root client and
must not close a transaction's reserved connection. Closing SQL resources also
does not stop or drain S42-Core's HTTP `Server`; that remains a separate server
lifecycle responsibility.

## Normalized driver errors

Database failures from structured methods, `executeRaw()`, and transaction
and connection lifecycle operations are exposed as the public `SQLError` class.
The direct `SQLite` wrapper uses the same contract.

```ts
import { SQLError, isSQLError, type SQLErrorCode } from 's42-core'

class SQLError extends Error {
	readonly code: SQLErrorCode
	readonly dialect: 'postgres' | 'mysql' | 'sqlite'
	readonly nativeCode?: string | number
	readonly errno?: string | number
	readonly sqlstate?: string
	readonly constraint?: string
	readonly cause: unknown
}
```

`code` is S42-Core's stable category. The remaining properties preserve the
metadata supplied by Bun and the database:

- `message` is the original driver message;
- `nativeCode` is the driver's original `code` value, such as
  `ER_DUP_ENTRY` or `SQLITE_CONSTRAINT_UNIQUE`;
- `errno` preserves Bun's string or numeric `errno`;
- `sqlstate` normalizes PostgreSQL's `errno` and MySQL's `sqlState` when
  available;
- `constraint` is populated when the driver reports it structurally;
- `cause` is the original error object.

Mapped categories are:

| Category                | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `unique_violation`      | Unique, primary-key, or row-id constraint failure.          |
| `foreign_key_violation` | Referenced or referencing row constraint failure.           |
| `not_null_violation`    | Required column received null.                              |
| `check_violation`       | Database `CHECK` constraint failure.                        |
| `duplicate_column`      | Existing column, when the engine supplies a stable code.    |
| `duplicate_table`       | Existing table, when the engine supplies a stable code.     |
| `serialization_failure` | Transaction serialization conflict.                         |
| `deadlock_detected`     | PostgreSQL/MySQL deadlock.                                  |
| `connection_failure`    | Connection/open failure recognized from structured codes.   |
| `database_busy`         | SQLite busy/locked or MySQL lock-wait condition.            |
| `unknown`               | Driver failure without a supported portable classification. |

```ts
try {
	await sql.insert('wallet_bindings', binding)
} catch (error) {
	if (
		isSQLError(error, 'unique_violation') &&
		error.constraint === 'wallet_bindings_pkey'
	) {
		// Confirm the existing row represents the same idempotent operation.
		return
	}

	throw error
}
```

`isSQLError(error, code?)` is a type guard. A unique violation alone does not
prove that an operation is a safe replay; check the expected constraint and
application data. S42-Core does not retry automatically: serialization and
deadlock retries must rerun the complete transaction, while a lost connection
during commit can have an ambiguous outcome.

Validation errors raised before driver execution and errors thrown by a
transaction/savepoint callback remain unchanged. SQLite reports duplicate
column and duplicate table as generic `SQLITE_ERROR`; S42-Core classifies those
as `unknown` instead of parsing localized message text.

The wrapper never adds query text or bound parameters to `SQLError`. The
original driver message and `cause` can still contain database values or
details, so do not log them blindly in services that handle secrets or personal
data.

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

Expression indexes are intentionally outside the structured column API because
their expressions, collations, and operator classes are engine-specific. Create
them with `executeRaw()` from trusted migration code. Manage formal table
constraints with trusted `alterTable()` clauses or `executeRaw()` rather than
expecting `createIndex()` to infer them.

### `dropIndex(tableName, indexName, options?)`

```ts
type DropIndexOptions = {
	ifExists?: boolean
	concurrently?: boolean
}

dropIndex(
	tableName: string,
	indexName: string,
	options?: DropIndexOptions,
): Promise<void>
```

Removes a standalone index using adapter-specific syntax. The portable
signature includes `tableName` because MySQL requires
`DROP INDEX index_name ON table_name`; PostgreSQL and SQLite only emit the
validated index name.

```ts
await sql.dropIndex('products', 'idx_products_tenant_updated', {
	ifExists: true,
	concurrently: true,
})
```

Options:

| Option         | Behavior                                                      |
| -------------- | ------------------------------------------------------------- |
| `ifExists`     | Defaults to `true` on PostgreSQL/SQLite and `false` on MySQL. |
| `concurrently` | Adds PostgreSQL `CONCURRENTLY`; unsupported by MySQL/SQLite.  |

MySQL rejects `ifExists: true` because its native `DROP INDEX` grammar does not
support that clause. PostgreSQL `DROP INDEX CONCURRENTLY` must run outside a
transaction. `dropIndex()` does not add `CASCADE`; indexes owned by primary-key
or unique constraints must be managed through engine-specific constraint DDL
with `alterTable()` or `executeRaw()`.

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

### `insert(tableName, data, options?)`

```ts
insert(tableName: string, data: KeyValueData): Promise<TypeReturnQuery | null>

insert<T = KeyValueData>(
	tableName: string,
	data: KeyValueData,
	options: InsertOptions,
): Promise<TypeReturningQuery<T> | null>
```

Inserts one row with bound values. Omitting `options` preserves the original
contract exactly: PostgreSQL executes `RETURNING *` internally, while
SQLite/MySQL use native write metadata, and the public result has no `rows`
property.

```ts
type InsertOptions = {
	returning: readonly string[]
}

type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
	affectedRows?: number
}

type TypeReturningQuery<T> = TypeReturnQuery & {
	rows: T[]
}
```

`changes` and `affectedRows` contain the same normalized count.
`lastInsertRowId` can be `undefined` when the driver/table does not expose an
`id` or `ID` value. In particular, a PostgreSQL `returning` projection that
omits the id cannot populate that metadata field.

Pass a non-empty `returning` list to receive selected PostgreSQL or SQLite
columns without a second query:

```ts
type InsertedUser = { id: number; created_at: Date }

const inserted = await sql.insert<InsertedUser>(
	'users',
	{ email: 'user@example.com' },
	{ returning: ['id', 'created_at'] },
)

console.log(inserted?.rows[0])
```

The explicit-options result always includes `rows`. An empty list deliberately
omits the SQL `RETURNING` clause and returns `rows: []`; on PostgreSQL this is
the opt-out from the legacy `RETURNING *` bandwidth cost:

```ts
const result = await sql.insert('audit_log', event, { returning: [] })
// result.rows === []
```

PostgreSQL and SQLite support non-empty `returning`. MySQL does not support the
clause, so S42-Core rejects a non-empty list before query execution; an empty
list remains valid and returns MySQL write metadata plus `rows: []`.

Returning columns are identifier-validated. `['*']` is accepted, but `*` cannot
be combined with named columns. Expressions and aliases belong in
`executeRaw()`.

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
- inclusive `$between: [lower, upper]`
- recursive `$and: [...]`, `$or: [...]`, and `$not: {...}` groups

Top-level fields and logical groups are joined with implicit `AND`. Logical
groups are parenthesized, and `$and`/`$or` require non-empty arrays of non-empty
filter objects. `$not` requires one non-empty filter object and uses SQL
three-valued logic.

```ts
const visible = await sql.select<{ id: number }>({
	tableName: 'items',
	columns: ['id'],
	whereClause: {
		tenant_id: tenantId,
		deleted_at: null,
		$or: [
			{ status: 'active' },
			{
				status: 'pending',
				available_at: { $between: [windowStart, windowEnd] },
			},
		],
	},
})
```

Null comparisons never bind `NULL` to `=` or `!=`:

- `{ deleted_at: null }` and `{ deleted_at: { $eq: null } }` produce
  `deleted_at IS NULL`;
- `{ deleted_at: { $ne: null } }` produces `deleted_at IS NOT NULL`;
- null is rejected for ordering, `$like`, and `$between` operands.

Membership arrays are normalized consistently across adapters:

- `$in: []` is always false; `$nin: []` is always true;
- `$in: [value, null]` includes `field IS NULL` with `OR`;
- `$nin: [value, null]` includes `field IS NOT NULL` with `AND`;
- every non-null array element remains a bound parameter.

Field names at every nesting level are identifier-validated. Direct strings,
numbers, bigints, booleans, `Date`, typed arrays, and `null` are scalar values.
Only non-empty plain objects are treated as operator maps. `undefined`, direct
arrays, empty operator objects, empty logical groups, unsupported operators, and
invalid operand shapes throw before SQL execution. An empty top-level `{}` is
kept backwards compatible and produces no `WHERE`; do not pass it accidentally
to `update()` or `delete()`.

`$like` requires a string, but its case sensitivity still follows the configured
database and collation. `$ilike` and raw field expressions such as `lower(email)`
are deliberately unsupported because they are not portable identifiers. Use
`executeRaw()` with trusted SQL and bound values for those engine-specific cases.

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

Identifiers are allow-listed but emitted unchanged, not quoted. A syntactically
valid name that is reserved by the selected engine can still fail. Use
engine-appropriate schema names or trusted `executeRaw()` SQL when quoting is
required.

Filter and write values are bound parameters. These inputs remain deliberately
raw and trusted: `createTable`/`addTableColumns` type definitions,
`alterTable` clauses, `createIndex.where`, transaction option strings, and the
entire `executeRaw` query string.

## Current operational notes

- Test PostgreSQL, MySQL, and SQLite behavior against every engine/version used
  in production; SQL dialects and result metadata differ.
- `close()`/`end()` release SQL resources only; they do not stop the HTTP server.
- `dropTable()`, `dropColumn()`, `dropIndex()`, `alterTable()`, and unfiltered
  `delete()` are destructive operations even though identifiers are validated.
- `update()` with an empty `{}` filter is also unfiltered and affects every row.
  This behavior is intentionally preserved; make destructive intent explicit
  in application code and tests.
- Empty table schemas, insert/update data objects, and projection arrays are not
  normalized into alternate SQL forms. They can produce invalid engine SQL;
  validate these collection shapes before calling the wrapper.
- `selectPaginate()` performs two separate statements.
- Schema introspection is normalized and intentionally incomplete.
- Parameterized structured methods currently translate generated `?`
  placeholders by splitting the query into a Bun tagged-template call. A
  literal `?` in the same generated SQL text can desynchronize bindings.
  `executeRaw()` does not use this bridge and delegates directly to Bun.

## Bun references

- [Bun SQL documentation](https://bun.sh/docs/runtime/sql)
- [`Bun.SQL.PostgresOrMySQLOptions`](https://bun.com/reference/bun/SQL/PostgresOrMySQLOptions)
- [`Bun.SQL.connect`](https://bun.com/reference/bun/SQL/connect)
- [`Bun.SQL.close`](https://bun.com/reference/bun/SQL/close)
- [`Bun.SQL.end`](https://bun.com/reference/bun/SQL/end)
- [`TransactionSQL.beginDistributed`](https://bun.com/reference/bun/TransactionSQL/beginDistributed)
- [Dedicated `bun:sqlite` documentation](https://bun.sh/docs/runtime/sqlite)
- [PostgreSQL client connection defaults](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [PostgreSQL error codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [MySQL server error reference](https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- [SQLite result and error codes](https://www.sqlite.org/rescode.html)
