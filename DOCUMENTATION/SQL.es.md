# SQL

## Propósito y modelo de drivers

`SQL` es el wrapper de persistencia multi-motor y basado en promesas de
S42-Core. Usa el cliente nativo `SQL` de Bun para PostgreSQL, MySQL y SQLite, y
expone la misma API de CRUD, schema, queries raw y transacciones para los tres
adaptadores.

Esta clase es distinta del wrapper directo [`SQLite`](./SQLITE.es.md) de
S42-Core:

- `SQL` usa la API unificada `Bun.SQL` y soporta callbacks transaccionales
  asincrónicos.
- `SQLite` usa la API dedicada y síncrona `bun:sqlite`, y expone sus tipos de
  resultado de bajo nivel.

Ninguna de las dos APIs instala un driver de base de datos desde npm.

## Constructor

```ts
import { SQL } from 's42-core'

const sql = new SQL({
	type: 'postgres', // 'postgres' | 'mysql' | 'sqlite'
	url: process.env.DATABASE_URL,
	tls: { rejectUnauthorized: true },
})
```

```ts
type TypeSQLConnection = {
	type: 'mysql' | 'postgres' | 'sqlite'
	url?: string
	tls?: Bun.TLSOptions
}
```

Comportamiento de conexión:

- PostgreSQL/MySQL con `url`: Bun detecta el adaptador desde la URI de conexión.
- PostgreSQL/MySQL sin `url`: los defaults de conexión se delegan a `Bun.SQL` y
  su resolución de variables de entorno.
- SQLite: `url` es el nombre del archivo y por default es `db.sqlite`; usar
  `:memory:` para una base en memoria. El wrapper habilita WAL antes de su
  primera query.
- `tls` se envía solamente a conexiones PostgreSQL/MySQL.

## Métodos de schema

### `createTable(tableName, schema)`

```ts
createTable(tableName: string, schema: ColumnDefinition): Promise<boolean>
```

Ejecuta `CREATE TABLE IF NOT EXISTS` y devuelve `true` luego del éxito.

```ts
await sql.createTable('products', {
	id: 'INTEGER PRIMARY KEY',
	name: 'VARCHAR(200) NOT NULL',
	price: 'DECIMAL(12, 2) NOT NULL',
})
```

Los nombres de tabla y columnas se validan. Cada valor del schema es un
fragmento DDL raw confiable; se convierte a mayúsculas, pero no se parsea ni se
escapa. Nunca construir un valor de schema desde input de requests.

### `alterTable(tableName, alterations)`

```ts
alterTable(tableName: string, alterations: string | string[]): Promise<boolean>
```

Prefija cada cláusula recibida con `ALTER TABLE <tableName>` y las ejecuta de
forma secuencial. Devuelve `true` después de que todas terminan correctamente.

```ts
await sql.alterTable('products', [
	'ADD COLUMN sku VARCHAR(80)',
	'RENAME COLUMN price TO unit_price',
])
```

Solo `tableName` se valida como identificador. Las cláusulas son DDL raw
específico del motor y deben provenir de código confiable de la aplicación o de
migraciones. Al usar un array sin una transacción envolvente, las primeras
cláusulas pueden quedar aplicadas si una posterior falla; el soporte de DDL
transaccional también varía por motor.

### `addTableColumns(tableName, changes)`

```ts
addTableColumns(tableName: string, changes: ColumnDefinition): Promise<boolean>
```

Crea una alteración `ADD COLUMN <name> <definition>` por entrada y delega en
`alterTable()`.

```ts
await sql.addTableColumns('products', {
	enabled: 'BOOLEAN DEFAULT TRUE',
	updated_at: 'TIMESTAMP',
})
```

Los nombres de columna se validan. Las definiciones son fragmentos DDL raw
confiables.

### `dropColumn(tableName, columnName)`

```ts
dropColumn(tableName: string, columnName: string): Promise<boolean>
```

Ejecuta `ALTER TABLE <tableName> DROP COLUMN <columnName>`. Ambos identificadores
se validan. El adaptador de base determina si la columna se puede eliminar y
cómo se manejan sus dependencias.

### `createIndex(tableName, columns, options?)`

```ts
type SQLIndexColumn =
	| string
	| { name: string; order?: 'ASC' | 'DESC' | 'asc' | 'desc' }

type CreateIndexOptions = {
	name?: string
	unique?: boolean
	ifNotExists?: boolean
	concurrently?: boolean
	using?: string
	include?: string[]
	where?: string
}

createIndex(
	tableName: string,
	columns: string | SQLIndexColumn[],
	options?: CreateIndexOptions,
): Promise<void>
```

La llamada original para una sola columna sigue soportada:

```ts
await sql.createIndex('products', 'sku')
```

Ejemplo compuesto:

```ts
await sql.createIndex(
	'products',
	[
		{ name: 'tenant_id', order: 'ASC' },
		{ name: 'updated_at', order: 'DESC' },
	],
	{
		name: 'idx_products_tenant_updated',
		unique: false,
		where: 'enabled = TRUE',
	},
)
```

Opciones:

| Opción         | Comportamiento                                                   |
| -------------- | ---------------------------------------------------------------- |
| `name`         | Identificador explícito; default `idx_<table>_<columns>`.        |
| `unique`       | Agrega `UNIQUE`.                                                 |
| `ifNotExists`  | Default `true` en PostgreSQL/SQLite y `false` en MySQL.          |
| `concurrently` | Agrega `CONCURRENTLY` de PostgreSQL.                             |
| `using`        | Método de acceso PostgreSQL/MySQL, por ejemplo `btree` o `hash`. |
| `include`      | Agrega columnas no-key `INCLUDE` de PostgreSQL.                  |
| `where`        | Predicado raw para un índice parcial PostgreSQL/SQLite.          |

Las combinaciones opción/adaptador no soportadas rechazan antes de ejecutar la
query. Se validan los identificadores de tabla, índice, columnas key, columnas
incluidas y método de acceso. El predicado `where` es deliberadamente raw y
nunca debe incluir texto controlado por un request.

PostgreSQL no permite `CREATE INDEX CONCURRENTLY` dentro de una transacción;
ejecutar esa forma fuera de `begin()`/`transaction()`.

### `dropTable(tableName)`

```ts
dropTable(tableName: string): Promise<boolean | null>
```

Ejecuta `DROP TABLE IF EXISTS` y actualmente devuelve `true`. Es destructivo;
aunque el nombre se valide, la tabla debe seleccionarse desde código confiable.

### `getAllTables()`

```ts
getAllTables(): Promise<tableInternalSchema[]>
```

Lista tablas de usuario mediante `PRAGMA table_list`, `pg_catalog.pg_tables` o
`SHOW TABLES`, según el adaptador. Los resultados PostgreSQL/MySQL se normalizan
al formato común de tabla cuando es posible.

### `getTableSchema(tableName)`

```ts
getTableSchema(tableName: string): Promise<tableRowSchema[]>
```

Devuelve metadata normalizada de columnas. SQLite expone sus valores nativos de
`PRAGMA table_info`. La metadata PostgreSQL/MySQL se mapea al mismo formato
público; los campos que la query actual no puede obtener usan valores fallback,
por lo que este método no reemplaza una introspección completa de constraints o
índices.

### `validateTableSchema(tableName, expectedSchema)`

```ts
validateTableSchema(
	tableName: string,
	expectedSchema: ColumnDefinition,
): Promise<boolean>
```

Indica si cada key de `expectedSchema` existe en la tabla actual. No compara
tipos SQL, nullability, defaults, keys ni índices. Un schema esperado vacío
lanza `Table schema not defined`.

## Métodos de datos

### `insert(tableName, data)`

```ts
insert(tableName: string, data: KeyValueData): Promise<TypeReturnQuery | null>
```

Inserta una fila con valores bindeados. PostgreSQL agrega `RETURNING *`; los
demás adaptadores usan su metadata de escritura. El resultado normalizado es:

```ts
type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
	affectedRows?: number
}
```

`changes` y `affectedRows` contienen el mismo total normalizado.
`lastInsertRowId` puede ser `undefined` cuando el driver o la tabla no expone un
valor `id` o `ID`.

### `select(options)`

```ts
select<T>({
	tableName,
	columns?,      // default ['*']
	whereClause?,
	sort?,
	limit?,        // default 100
	page?,         // default 1
}): Promise<T[] | null>
```

`page` comienza en uno y se convierte en `OFFSET (page - 1) * limit`. Un valor
de sort igual a `1` produce `ASC`; cualquier otro número produce `DESC`.

```ts
const products = await sql.select<{ id: number; name: string }>({
	tableName: 'products',
	columns: ['id', 'name'],
	whereClause: { enabled: true, price: { $gte: 100 } },
	sort: { updated_at: -1 },
	page: 1,
	limit: 20,
})
```

Validar `page` y `limit` como enteros positivos y acotados en la frontera del
request. Son números en TypeScript, pero se renderizan en el SQL generado.

### `selectPaginate(options)`

```ts
selectPaginate<T>({
	tableName,
	page?,         // default 1
	limit?,        // default 10
	columns?,
	whereClause?,
	sort?,
}): Promise<{ data: T[]; total: number; page: number; limit: number }>
```

Ejecuta `select()` seguido de `count()` con el mismo filtro. Las dos sentencias
no se colocan automáticamente en una transacción, por lo que escrituras
concurrentes pueden cambiar el total entre ambas queries.

### `update(options)` y `updateById(...)`

```ts
update({
	tableName: string
	whereClause: object
	data: KeyValueData
}): Promise<number | null>

updateById(
	tableName: string,
	id: string | number,
	data: KeyValueData,
): Promise<number | null>
```

Los valores se bindean y el retorno es el total normalizado de filas afectadas.
`updateById()` delega en `update()` con `{ id }`.

### `delete(tableName, whereClause?)` y `deleteById(...)`

```ts
delete(tableName: string, whereClause?: object): Promise<number | null>
deleteById(tableName: string, id: string | number): Promise<number | null>
```

Devuelve el total normalizado de filas afectadas. Omitir `whereClause` elimina
todas las filas de la tabla. `deleteById()` delega en `delete()` con `{ id }`.

### `count(options)`

```ts
count({ tableName, whereClause? }): Promise<number>
```

Ejecuta `COUNT(*)` con el filtro estilo Mongo opcional y devuelve un número de
JavaScript.

## Filtros estilo Mongo

El export `translateMongoJsonToSql(query)` y todos los inputs `whereClause`
soportan:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

Los campos de primer nivel se unen con `AND`. No están implementados operadores
lógicos anidados como `$or` y `$and`. `$in` y `$nin` requieren arrays. Los
nombres de campos se validan y los valores se devuelven como parámetros para
binding.

## Transacciones

### `begin(...)` y `transaction(...)`

```ts
begin<T>(callback: SQLTransactionCallback<T>): Promise<SQLTransactionResult<T>>
begin<T>(
	options: string,
	callback: SQLTransactionCallback<T>,
): Promise<SQLTransactionResult<T>>

// Alias de Bun con los mismos overloads
transaction<T>(...): Promise<SQLTransactionResult<T>>
```

Bun inicia la transacción, hace commit cuando el callback termina correctamente
y rollback cuando lanza o rechaza. El callback recibe un wrapper `SQL` de
S42-Core con scope, no el cliente raw de Bun; por eso todos los métodos de este
documento siguen disponibles y se ejecutan sobre la conexión transaccional.

```ts
const orderId = await sql.begin(async transaction => {
	const inserted = await transaction.insert('orders', {
		customer_id: customerId,
		status: 'pending',
	})

	await transaction.update({
		tableName: 'inventory',
		whereClause: { product_id: productId },
		data: { reserved: true },
	})

	return inserted?.lastInsertRowId
})
```

El string opcional `options` se envía al `BEGIN` de Bun/base sin parseo de
S42-Core. Es configuración confiable específica del motor: algunos ejemplos
son `read write` en PostgreSQL e `IMMEDIATE`, `DEFERRED` o `EXCLUSIVE` en SQLite.

Bun también resuelve un array de promesas de queries retornado por el callback:

```ts
const results = await sql.transaction(transaction => [
	transaction.insert('audit_log', { action: 'created' }),
	transaction.insert('outbox', { event: 'ORDER.CREATED' }),
])
```

### `savepoint(...)`

```ts
savepoint<T>(callback: SQLTransactionCallback<T>): Promise<T>
savepoint<T>(name: string, callback: SQLTransactionCallback<T>): Promise<T>
```

`savepoint()` solo está disponible en el wrapper con scope recibido por un
callback de transacción o savepoint. Si su callback falla, Bun hace rollback al
savepoint y relanza. Capturar el error dentro de la transacción externa para
continuarla.

```ts
await sql.begin(async transaction => {
	await transaction.insert('orders', order)

	try {
		await transaction.savepoint('optional_audit', async savepoint => {
			await savepoint.insert('audit_log', auditRecord)
			throw new Error('discard optional audit')
		})
	} catch {
		// Solo se revirtió el trabajo del savepoint.
	}

	await transaction.insert('outbox', event)
})
```

### Transacciones distribuidas (2PC)

```ts
beginDistributed<T>(
	name: string,
	callback: SQLTransactionCallback<T>,
): Promise<SQLTransactionResult<T>>

// Alias de beginDistributed
distributed<T>(name: string, callback: SQLTransactionCallback<T>): Promise<...>

commitDistributed(name: string): Promise<void>
rollbackDistributed(name: string): Promise<void>
```

`beginDistributed()` ejecuta la fase 1 y deja preparada una transacción exitosa.
Completar después la fase 2 con exactamente uno de `commitDistributed()` o
`rollbackDistributed()`. Un error no capturado del callback hace que Bun
ejecute rollback.

```ts
await sql.beginDistributed('order_2026_00042', async transaction => {
	await transaction.insert('orders', order)
})

// Luego, cuando decide el coordinador:
await sql.commitDistributed('order_2026_00042')
// o: await sql.rollbackDistributed('order_2026_00042')
```

PostgreSQL lo implementa con prepared transactions y MySQL con transacciones
XA. La configuración de base, privilegios, recuperación, unicidad de nombres y
durabilidad del coordinador siguen siendo responsabilidades de la aplicación y
operaciones. SQLite no soporta transacciones distribuidas; los cuatro wrappers
distribuidos rechazan con el error del adaptador Bun.

## Bypass de query raw

### `executeRaw(query, params?)`

```ts
executeRaw<T = unknown>(query: string, params?: any[]): Promise<T>
```

Delega directamente en `Bun.SQL.unsafe()`. Saltea la validación de tablas y
columnas, traducción de filtros, paginación, helpers de schema y normalización de
resultados de S42-Core. El valor resuelto es el resultado nativo de Bun SQL para
el adaptador.

```ts
const rows = await sql.executeRaw<Array<{ id: number; name: string }>>(
	'SELECT id, name FROM products WHERE id = $1',
	[productId],
)
```

Contrato de seguridad:

- el string SQL debe ser estático o armarse exclusivamente desde código
  confiable;
- `params` siguen siendo valores bindeados y son el único lugar seguro para
  datos de requests;
- los placeholders nativos dependen del adaptador (`$1`, `$2`, ... para
  PostgreSQL; `?` para MySQL/SQLite);
- el comportamiento de múltiples sentencias depende del adaptador y no debe
  asumirse portable.

`executeRaw()` es deliberadamente una vía de escape. Preferir los métodos
estructurados cuando puedan expresar la query.

## Seguridad de identificadores y fragmentos raw

Los métodos estructurados validan identificadores de tabla, columna, campo de
filtro, sort e índice antes de interpolarlos:

- segmento aceptado: `[A-Za-z0-9_]+`;
- se aceptan nombres calificados separados por puntos;
- `*` se acepta solamente como proyección;
- se rechazan expresiones y aliases como `COUNT(*) AS total`.

Los valores de filtros y escrituras se bindean. Estos inputs siguen siendo
deliberadamente raw y confiables: definiciones de tipo de
`createTable`/`addTableColumns`, cláusulas de `alterTable`, `createIndex.where`,
strings de opciones transaccionales y el string completo de `executeRaw`.

## Notas operativas actuales

- Probar PostgreSQL, MySQL y SQLite contra cada motor/versión usado en
  producción; los dialectos SQL y la metadata de resultados difieren.
- La clase no expone actualmente un método público `close()` de conexión.
- `dropTable()`, `dropColumn()`, `alterTable()` y `delete()` sin filtro son
  operaciones destructivas aunque los identificadores se validen.
- `selectPaginate()` ejecuta dos sentencias separadas.
- La introspección de schema está normalizada y es deliberadamente incompleta.
- Los métodos estructurados parametrizados actualmente traducen los
  placeholders `?` generados separando la query para construir una llamada
  tagged-template de Bun. Un `?` literal en el mismo SQL generado puede
  desalinear el binding. `executeRaw()` no usa este puente y delega directamente
  en Bun.

## Referencias de Bun

- [Documentación Bun SQL](https://bun.sh/docs/runtime/sql)
- [`TransactionSQL.beginDistributed`](https://bun.com/reference/bun/TransactionSQL/beginDistributed)
- [Documentación dedicada de `bun:sqlite`](https://bun.sh/docs/runtime/sqlite)
