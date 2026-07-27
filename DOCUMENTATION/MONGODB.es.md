# MONGODB

## Propósito

`MongoClient` encapsula el driver oficial `mongodb` con singleton por proceso,
creación validada de `ObjectId` y un helper de paginación.

## Singleton y conexión

```ts
import { MongoClient } from 's42-core'

const db = MongoClient.getInstance({
	connectionString: process.env.MONGO_URI!,
	database: process.env.MONGO_DB!,
})

await db.connect()
```

Ambos valores son requeridos. La primera configuración de `getInstance()`
prevalece durante la vida del proceso; llamadas posteriores no la reemplazan.

## API

- `connect(): Promise<void>`
- `close(): Promise<void>`
- `getDB()`
- `getCollection<T>(name)`
- `ObjectId(id)`
- `MongoClient.paginate<T>(collection, query?, fields?, options?)`

`getDB()` y `getCollection()` lanzan error hasta que `connect()` finaliza.
`ObjectId(id)` rechaza identificadores inválidos antes de construirlos.

## Paginación

Defaults:

- `page: 1`
- `limit: 30`
- `sort: { added: -1 }`
- query y proyección vacías

`page` y `limit` deben ser mayores que cero.

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

Resultado:

```ts
{
  docs: T[]
  count: number
  limit: number
  page: number
  totalPages: number
}
```

`fields` se convierte en la proyección MongoDB. `opts` se pasa a `find`, con la
proyección explícita teniendo precedencia.

## `MongoDBStorage` interno

`src/MongoDBStorage` es una clase base interna, no un export root del paquete.
No existe un import `s42-core/...` soportado para consumidores.

El código del repositorio que lo use debe registrar el cliente conectado bajo
la clave local al proceso `db`:

```ts
Dependencies.add('db', db)
```

## Notas

- Cerrar el cliente durante el shutdown ordenado.
- Validar y limitar page/limit en la frontera HTTP.
- No llamar a `getInstance()` con credenciales de tenants o bases diferentes
  dentro del mismo proceso; usar el driver nativo cuando se requieran múltiples
  clientes.
