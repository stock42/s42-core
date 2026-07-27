# DEPENDENCIES

## Propósito

`Dependencies` es un registro estático mínimo, local al proceso, para
dependencias.

Sirve para clientes de base de datos, adaptadores, services o dobles de prueba
compartidos cuando no se usa inyección explícita por constructor.

## API

- `Dependencies.add<T>(name, dependency): void`
- `Dependencies.get<T>(name): T | null`
- `Dependencies.has(name): boolean`
- `Dependencies.remove(name): boolean`
- `Dependencies.clear(): void`

Las claves duplicadas lanzan error en vez de reemplazar la dependencia. Las
claves inexistentes devuelven `null`.

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
if (!resolved) {
	throw new Error('db dependency is not registered')
}
```

## Ciclo de vida

El registro:

- es global al proceso JavaScript;
- no tiene scopes, factories, disposal hooks ni resolución asíncrona;
- no cierra una dependencia al removerla o limpiar el registro.

Los consumidores siguen siendo responsables de cerrar MongoDB, Redis, SQLite,
eventos u otros recursos.

## Tests

Llamar a `Dependencies.clear()` en teardown cuando los tests comparten proceso.
Usar claves explícitas por bounded context para evitar colisiones.
