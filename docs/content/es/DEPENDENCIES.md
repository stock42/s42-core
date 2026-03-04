# DEPENDENCIES

## Proposito

`Dependencies` es un contenedor DI estatico y liviano para objetos compartidos en runtime.

Casos de uso:

- clientes de base de datos
- clientes de servicios
- adaptadores
- mocks/dobles de prueba

## API

- `Dependencies.add(name, dep)`
- `Dependencies.get<T>(name)`
- `Dependencies.remove(name)`
- `Dependencies.has(name)`
- `Dependencies.clear()`

## Ejemplo

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

## Notas

- Claves duplicadas se rechazan para evitar overrides accidentales.
- Preferir nombres explicitos por bounded context.
- Limpiar dependencias en teardown de tests.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
