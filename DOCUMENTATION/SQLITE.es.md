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

`bun:sqlite` ejecuta en forma sincrónica. Varios métodos del wrapper conservan
firmas históricas `async`, pero su trabajo de base ocurre sincrónicamente antes
de que resuelva la promise. Esta clase directa es una implementación separada;
el path multi-engine `SQL({ type: 'sqlite' })` usa el adaptador asíncrono
`Bun.SQL`.

## Errores

Los fallos de query y schema del driver usan el mismo contrato público
`SQLError` e `isSQLError()` que la clase multi-motor `SQL`. `message`,
`nativeCode`, `errno` y `cause` preservan los detalles originales de
`bun:sqlite`; `code` contiene la categoría portable de S42-Core o `unknown`.

```ts
try {
	db.insert('operators', duplicateOperator)
} catch (error) {
	if (isSQLError(error, 'unique_violation')) {
		// Verificar la fila existente antes de tratarlo como replay idempotente.
	}
}
```

SQLite expone códigos extendidos de constraints, por lo que las violaciones
unique, foreign-key, not-null y check se pueden clasificar sin parsear mensajes.
Los errores de columna o tabla duplicada usan `SQLITE_ERROR` genérico y por eso
quedan como `unknown`. Los errores de validación siguen siendo instancias
comunes de `Error`. Nunca se adjuntan el texto de la query ni sus parámetros
bindeados al error normalizado.

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

Se reexporta `translateMongoJsonToSql()` y comparte la gramática de filtros de
`SQL`: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$like`,
`$between` inclusivo y grupos recursivos `$and`, `$or` y `$not`. Un `null`
directo y `$eq: null` usan `IS NULL`; `$ne: null` usa `IS NOT NULL`. Los arrays
de membresía vacíos o que contienen null se normalizan sin emitir expresiones
`IN` inválidas o con lógica ternaria.

Los identificadores de tabla, columna, filtro y sort usan la misma validación
estricta de `SQL`. `*` se permite como proyección; expresiones y aliases se
rechazan. Los valores de runtime usan parámetros. Objetos de operadores vacíos,
operandos inválidos y grupos lógicos vacíos lanzan antes de ejecutar la query. La
clase directa `SQLite` no expone `SQL.executeRaw()`; usar la clase multi-motor
`SQL` cuando se necesite una vía de escape raw específica del motor.

Los strings de tipos del schema son fragmentos DDL confiables y no deben
provenir de input de requests.

Los identificadores se validan pero no se quotean. Nombres válidos para el
allow-list todavía pueden coincidir con palabras reservadas del motor. Los
fragmentos de tipo se convierten completos a uppercase, incluso texto dentro de
defaults entre comillas; usar DDL probado contra el motor y `SQL.executeRaw()`
cuando se necesite sintaxis raw exacta.

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
- `delete(tableName)` sin filtro y `update(..., {})` con filtro vacío afectan
  todas las filas. Es el comportamiento actual intencional; hacer explícitas
  las operaciones destructivas en código y tests de la aplicación.
- Data vacío en update genera un `SET` inválido y una proyección vacía genera un
  `SELECT` inválido. Validar ambos antes de llamar al wrapper.
- `limit` y `offset` se renderizan solamente cuando son truthy y se interpolan
  como números; `0` se omite y valores negativos no se rechazan. Validar enteros
  finitos no negativos en la frontera HTTP.
- `addTableColumns()` ejecuta un `ALTER TABLE` por columna sin transacción ni
  `IF NOT EXISTS`; una falla posterior puede dejar cambios anteriores aplicados
  y startups de schema concurrentes pueden competir.
- El wrapper no habilita WAL ni `PRAGMA foreign_keys`; configurar los pragmas
  SQLite necesarios fuera de esta abstracción. Usar `SQL` multi-engine cuando
  su inicialización WAL, transacciones o API raw sean más adecuadas.
- `close()` registra y absorbe errores del driver en vez de rechazar.
