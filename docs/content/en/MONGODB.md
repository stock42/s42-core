# MONGODB

## Purpose

`MongoClient` wraps the official `mongodb` driver and exposes a Bun-friendly API for S42-Core modules.

## Constructor and singleton

```ts
const db = MongoClient.getInstance({
  connectionString: process.env.MONGO_URI!,
  database: process.env.MONGO_DB!,
})
await db.connect()
```

## Main API

- `connect()`
- `close()`
- `getDB()`
- `getCollection<T>(name)`
- `ObjectId(id)`
- `static paginate(collection, query, fields, options)`

## Pagination helper

`MongoClient.paginate` returns:

- `docs`
- `count`
- `limit`
- `page`
- `totalPages`

## Example

```ts
const users = db.getCollection<{ email: string }>('users')
const page = await MongoClient.paginate<{ email: string }>(
  users,
  {},
  { email: 1 },
  { page: 1, limit: 20, sort: { _id: -1 } },
)
```

## Notes

- Connection string and database are required.
- Validate ObjectId values with `ObjectId(id)` helper.
- Register the client in `Dependencies` when using `MongoDBStorage`.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
