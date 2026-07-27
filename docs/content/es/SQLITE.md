# SQLITE

## Propósito

`SQLite` es el wrapper directo de `bun:sqlite`. Es independiente de la clase
multi-motor `SQL` y está orientado a storage embebido, local o single-node.

## Constructor

```ts
import { SQLite } from 's42-core'

const file = new SQLite({ type: 'file', filename: './service.sqlite' })
const memory = new SQLite({ type: 'memory' })
```

`filename` es requerido cuando `type` es `file`.

## API

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `dropTable(tableName)`
- `insert(tableName, data)`
- `select(tableName, columns?, whereClause?, sort?, limit?, offset?)`
- `update(tableName, whereClause, data)`
- `delete(tableName, whereClause?)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `close()`

La clase no expone `count`, `selectPaginate`, `updateById` ni `deleteById`.

## Campo `added` automático

`createTable()` agrega `added: integer` al schema. `insert()` agrega el timestamp
actual bajo `added`.

Ambos métodos mutan el objeto recibido:

```ts
const schema = { uuid: 'text primary key' }
db.createTable('items', schema)
// schema ahora también contiene added
```

No reutilizar esos objetos cuando la mutación pueda resultar sorpresiva.

## Filtros y seguridad de identificadores

Se reexporta `translateMongoJsonToSql()`, con soporte para `$eq`, `$ne`, `$gt`,
`$gte`, `$lt`, `$lte`, `$in`, `$nin` y `$like`.

Los identificadores de tabla, columna, filtro y sort usan la misma validación
estricta de `SQL`. `*` se permite como proyección; expresiones y aliases se
rechazan. Los valores de runtime usan parámetros.

Los strings de tipos del schema son fragmentos DDL confiables y no deben
provenir de input de requests.

## Ejemplo

```ts
const db = new SQLite({ type: 'memory' })

db.createTable('operators', {
	uuid: 'text primary key',
	email: 'text',
})

db.insert('operators', {
	uuid: crypto.randomUUID(),
	email: 'operator@stock42.com',
})

const rows = await db.select<{ uuid: string; email: string }>(
	'operators',
	['uuid', 'email'],
	{ email: { $like: '%@stock42.com' } },
)
```

## Notas

- `insert()` devuelve `void`; create/update/delete devuelven objetos de cambios
  nativos de `bun:sqlite`.
- Validar `limit` y `offset` numéricos en la frontera HTTP.
- Llamar a `close()` durante shutdown ordenado.
