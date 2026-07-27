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

## Internal `MongoDBStorage`

`src/MongoDBStorage` is an internal base class, not a root package export. There
is no supported `s42-core/...` import for package consumers.

Repository code that uses it must register the connected client under the
process-local key `db`:

```ts
Dependencies.add('db', db)
```

## Notes

- Close the client during graceful shutdown.
- Validate and cap page/limit at the HTTP boundary.
- Do not call `getInstance()` with different tenant or database credentials in
  the same process; use the native driver directly when multiple clients are
  required.
