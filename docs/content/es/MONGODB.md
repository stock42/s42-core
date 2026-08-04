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

La query de página y `countDocuments()` corren como dos operaciones
independientes, por lo que writes concurrentes pueden hacer que `docs` y
`count` describan snapshots levemente distintos. La validación solamente
rechaza valores `<= 0`; validar enteros, valores finitos y un límite máximo en
la frontera HTTP.

## `MongoDBStorage` interno

`src/MongoDBStorage` es una clase base interna, no un export root del paquete.
No existe un import `s42-core/...` soportado para consumidores.

El código del repositorio que lo use debe registrar el cliente conectado bajo
la clave local al proceso `db`:

```ts
Dependencies.add('db', db)
```

El constructor resuelve esa dependencia inmediatamente y lanza si falta. Los
helpers protegidos de instancia son:

- `_insert(model)`: guarda `model.getData()` bajo `data` y agrega metadata
  `uuid`, `_added`, `_v: 0` y `_n: 0`;
- `_insertFlat(model)`: guarda los datos del modelo en la raíz con la misma
  metadata;
- `getCollection()`: devuelve la colección nativa configurada;
- `getObjectId()`: devuelve el helper constructor `ObjectId` del cliente
  registrado.

Los helpers estáticos del repositorio incluyen `createIndex`, `_distinct`,
`_aggregate`, `_insert`, `_findOne`, `_find`, `_getByUUID`, `_count`,
`_update`, `_deleteOne`, `_deleteMany`, `_delete` y `_search`. `_update`
siempre define `updatedAt`, incrementa `_n`, usa `updateMany` y hoy descarta el
resultado nativo. `_search` está tipado para la forma anidada de `_insert`; los
documentos flat necesitan su propio contrato de proyección/resultado.

Salvo `createIndex`, que usa optional chaining, los helpers estáticos asumen que
existe la dependencia `db` y pueden fallar al dereferenciarla. Toda esta clase
base es una utilidad interna del repositorio y puede cambiar sin las garantías
de compatibilidad de la API raíz.

## Notas

- Cerrar el cliente durante el shutdown ordenado.
- `connect()` registra el error nativo y lanza un nuevo error genérico de
  conexión sin conservarlo como `cause`.
- `close()` registra y absorbe fallas de cierre, y no limpia el handle `Db`
  almacenado. Un `getDB()` posterior puede devolver un handle cuyo cliente está
  cerrado; reconectar explícitamente antes de reutilizarlo.
- Validar y limitar page/limit en la frontera HTTP.
- El sort default de paginación es `{ added: -1 }`; no es `_added`, el campo de
  metadata usado por `MongoDBStorage` interno.
- No llamar a `getInstance()` con credenciales de tenants o bases diferentes
  dentro del mismo proceso; usar el driver nativo cuando se requieran múltiples
  clientes.
