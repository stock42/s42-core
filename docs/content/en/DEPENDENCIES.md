# DEPENDENCIES

## Purpose

`Dependencies` is a static lightweight DI container for shared runtime objects.

Use cases:

- database clients
- service clients
- adapters
- test doubles/mocks

## API

- `Dependencies.add(name, dep)`
- `Dependencies.get<T>(name)`
- `Dependencies.remove(name)`
- `Dependencies.has(name)`
- `Dependencies.clear()`

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
```

## Notes

- Duplicate keys are rejected to prevent accidental overrides.
- Prefer explicit key names per bounded context.
- Clear dependencies in test teardown.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
