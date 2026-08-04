# MONGODB

## Purpose

`MongoClient` wraps the official `mongodb` driver with a process-wide singleton,
validated `ObjectId` creation, and a pagination helper.

## Singleton and connection

```ts
import { MongoClient } from 's42-core'

const db = MongoClient.getInstance({
	connectionString: process.env.MONGO_URI!,
	database: process.env.MONGO_DB!,
})

await db.connect()
```

Both values are required. The first `getInstance()` configuration wins for the
life of the process; later calls do not replace it.

## API

- `connect(): Promise<void>`
- `close(): Promise<void>`
- `getDB()`
- `getCollection<T>(name)`
- `ObjectId(id)`
- `MongoClient.paginate<T>(collection, query?, fields?, options?)`

`getDB()` and `getCollection()` throw until `connect()` succeeds.
`ObjectId(id)` rejects invalid identifiers before construction.

## Pagination

Defaults:

- `page: 1`
- `limit: 30`
- `sort: { added: -1 }`
- empty query and projection

`page` and `limit` must be greater than zero.

```ts
const users = db.getCollection<{ email: string }>('users')
const result = await MongoClient.paginate<{ email: string }>(
	users,
	{},
	{ email: 1 },
	{
		page: 1,
		limit: 20,
		sort: { _id: -1 },
		opts: {},
	},
)
```

Result:

```ts
{
  docs: T[]
  count: number
  limit: number
  page: number
  totalPages: number
}
```

`fields` becomes the MongoDB projection. `opts` is passed into `find`, with the
explicit projection taking precedence.

The page query and `countDocuments()` run as two independent operations, so
concurrent writes can make `docs` and `count` describe slightly different
snapshots. Validation only rejects values `<= 0`; validate integers, finite
values, and a maximum limit at the HTTP boundary.

## Internal `MongoDBStorage`

`src/MongoDBStorage` is an internal base class, not a root package export. There
is no supported `s42-core/...` import for package consumers.

Repository code that uses it must register the connected client under the
process-local key `db`:

```ts
Dependencies.add('db', db)
```

Construction resolves that dependency immediately and throws when it is
missing. The protected instance helpers are:

- `_insert(model)`: stores `model.getData()` below `data` plus `uuid`, `_added`,
  `_v: 0`, and `_n: 0` metadata;
- `_insertFlat(model)`: stores model data at the document root with the same
  metadata;
- `getCollection()`: returns the native collection for the configured name;
- `getObjectId()`: returns the registered client's `ObjectId` constructor
  helper.

Static repository helpers include `createIndex`, `_distinct`, `_aggregate`,
`_insert`, `_findOne`, `_find`, `_getByUUID`, `_count`, `_update`,
`_deleteOne`, `_deleteMany`, `_delete`, and `_search`. `_update` always sets
`updatedAt`, increments `_n`, uses `updateMany`, and currently discards the
native update result. `_search` is typed for the nested `_insert` document
shape; flat documents need their own projection/result contract.

Except for optional-chained `createIndex`, static helpers assume the `db`
dependency exists and can fail while dereferencing it. This entire base class
is an internal repository utility and may change without the root package API's
compatibility guarantees.

## Notes

- Close the client during graceful shutdown.
- `connect()` logs the native connection error and throws a new generic
  connection error without retaining it as `cause`.
- `close()` logs and swallows close failures, and does not clear the stored
  `Db` handle. A later `getDB()` can therefore return a handle whose client was
  closed; reconnect explicitly before reuse.
- Validate and cap page/limit at the HTTP boundary.
- The pagination default sort is `{ added: -1 }`; it is not `_added`, the
  metadata field used by internal `MongoDBStorage`.
- Do not call `getInstance()` with different tenant or database credentials in
  the same process; use the native driver directly when multiple clients are
  required.
