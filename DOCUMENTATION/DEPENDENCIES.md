# DEPENDENCIES

## Purpose

`Dependencies` is a minimal process-local static dependency registry.

It is suitable for shared database clients, adapters, services, or test doubles
when explicit constructor injection is not used.

## API

- `Dependencies.add<T>(name, dependency): void`
- `Dependencies.get<T>(name): T | null`
- `Dependencies.has(name): boolean`
- `Dependencies.remove(name): boolean`
- `Dependencies.clear(): void`

Duplicate keys throw instead of replacing an existing dependency. Missing keys
return `null`.

## Example

```ts
import { Dependencies, MongoClient } from 's42-core'

const db = MongoClient.getInstance({
	connectionString: process.env.MONGO_URI!,
	database: process.env.MONGO_DB!,
})
await db.connect()

Dependencies.add('db', db)

const resolved = Dependencies.get<MongoClient>('db')
if (!resolved) {
	throw new Error('db dependency is not registered')
}
```

## Lifecycle

The registry:

- is global to the JavaScript process;
- has no scopes, factories, disposal hooks, or async resolution;
- does not close a dependency when it is removed or cleared.

Consumers remain responsible for closing MongoDB, Redis, SQLite, event, or other
resources.

## Testing

Call `Dependencies.clear()` in teardown when tests share a process. Use unique,
bounded-context keys to prevent accidental collisions.
