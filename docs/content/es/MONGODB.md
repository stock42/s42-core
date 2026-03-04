# MONGODB

## Proposito

`MongoClient` encapsula el driver oficial `mongodb` y expone una API amigable para modulos S42-Core.

## Constructor y singleton

```ts
const db = MongoClient.getInstance({
  connectionString: process.env.MONGO_URI!,
  database: process.env.MONGO_DB!,
})
await db.connect()
```

## API principal

- `connect()`
- `close()`
- `getDB()`
- `getCollection<T>(name)`
- `ObjectId(id)`
- `static paginate(collection, query, fields, options)`

## Helper de paginacion

`MongoClient.paginate` retorna:

- `docs`
- `count`
- `limit`
- `page`
- `totalPages`

## Ejemplo

```ts
const users = db.getCollection<{ email: string }>('users')
const page = await MongoClient.paginate<{ email: string }>(
  users,
  {},
  { email: 1 },
  { page: 1, limit: 20, sort: { _id: -1 } },
)
```

## Notas

- `connectionString` y `database` son obligatorios.
- Validar ObjectId con el helper `ObjectId(id)`.
- Registrar cliente en `Dependencies` al usar `MongoDBStorage`.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
