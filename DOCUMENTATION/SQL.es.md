# SQL

## Propósito y modelo de drivers

`SQL` es el wrapper de persistencia multi-motor y basado en promesas de
S42-Core. Usa el cliente nativo `SQL` de Bun para PostgreSQL, MySQL y SQLite, y
expone la misma API de CRUD, schema, queries raw y transacciones para los tres
adaptadores.

`SQL` es un helper de ejecución acotado, no un ORM. No modela relaciones,
entidades, planes de consulta ni cada capacidad de los motores. Los métodos
estructurados cubren operaciones comunes y `executeRaw()` mantiene disponible
el SQL específico de cada motor sin agregar una abstracción estilo ORM.

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
	max: 20,
	connectionTimeout: 10,
	idleTimeout: 30,
	maxLifetime: 3600,
	connection: {
		statement_timeout: 15_000,
		lock_timeout: 5_000,
		application_name: 's42-api',
	},
})
```

```ts
type TypeSQLConnection = {
	type: 'mysql' | 'postgres' | 'sqlite'
	url?: string
	tls?: Bun.TLSOptions
	max?: number
	connectionTimeout?: number
	idleTimeout?: number
	maxLifetime?: number
	connection?: Record<string, string | number | boolean>
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

### Configuración de pool, timeouts y sesión

S42-Core reenvía los nombres nativos de Bun sin agregar una segunda capa de
pool o retries:

| Opción              | Motores          | Contrato de Bun                                                |
| ------------------- | ---------------- | -------------------------------------------------------------- |
| `max`               | PostgreSQL/MySQL | Cantidad máxima de conexiones en el pool nativo.               |
| `connectionTimeout` | PostgreSQL/MySQL | Segundos máximos para establecer una conexión.                 |
| `idleTimeout`       | PostgreSQL/MySQL | Timeout nativo de Bun para conexiones ociosas del pool.        |
| `maxLifetime`       | PostgreSQL/MySQL | Vida máxima de una conexión, en segundos.                      |
| `connection`        | PostgreSQL       | Parámetros runtime enviados al crear cada conexión PostgreSQL. |

Las cuatro opciones numéricas se pasan directamente a Bun y usan el contrato de
entrada en segundos de Bun, incluida su semántica runtime para `idleTimeout`.
Omitirlas conserva sus defaults. SQLite tiene una
conexión nativa por instancia `SQL`, no un pool PostgreSQL/MySQL; por eso pasar
cualquiera de estas opciones de pool/sesión con `type: 'sqlite'` lanza un error
durante la construcción. Pasar `connection` para MySQL también lanza un error en
vez de ignorar silenciosamente configuración exclusiva de PostgreSQL.

`connection` es la vía de escape a defaults de sesión de PostgreSQL. Por
ejemplo, `statement_timeout: 15_000` y `lock_timeout: 5_000` usan el default de
milisegundos de PostgreSQL para valores numéricos y aplican a cada conexión nueva
del pool. Mantener estos valores en configuración confiable de la aplicación.

El tamaño del pool y `connectionTimeout` **no** limitan una query en ejecución.
En PostgreSQL, usar `statement_timeout` (o su equivalente a nivel de base/rol)
cuando la base deba cancelar sentencias lentas. S42-Core no implementa un timeout
genérico con `Promise.race`, porque devolvería el control mientras la query sigue
ocupando su conexión. Tampoco reintenta operaciones SQL automáticamente; los
retries deben envolver operaciones o transacciones completas, explícitamente
idempotentes, en el límite de la aplicación.

## Ciclo de vida de la conexión

La construcción sigue siendo lazy para mantener compatibilidad. Llamar a
`connect()` cuando el inicio de la aplicación deba fallar temprano ante un
endpoint inválido, una configuración TLS incorrecta o credenciales inválidas.

```ts
type SQLCloseOptions = {
	timeout?: number
}

connect(): Promise<this>
ping(): Promise<void>
close(options?: SQLCloseOptions): Promise<void>
end(options?: SQLCloseOptions): Promise<void>
```

```ts
const sql = new SQL(config)

await sql.connect()
await sql.ping()

// Durante el apagado, después de detener y drenar el servidor HTTP:
await sql.close({ timeout: 10 })
```

- `connect()` delega en la conexión nativa de Bun, inicializa el estado WAL del
  wrapper SQLite y devuelve la misma instancia `SQL` de S42-Core. Establece una
  conexión utilizable; no abre anticipadamente todos los slots del pool.
- `ping()` ejecuta un round trip real con `SELECT 1`. Puede llamarse sin un
  `connect()` previo porque Bun conserva su comportamiento lazy.
- `close()` delega el cierre de la conexión/pool a Bun. Sin opciones espera las
  queries pendientes; `timeout` se mide en segundos y `0` cierra inmediatamente.
- `end()` es un alias exacto de `close()`.

Los fallos del driver en los cuatro métodos usan el contrato público `SQLError`;
`ping()` no transforma fallos en `false`. S42-Core no reintenta conexiones
automáticamente. Después de `close()`/`end()`, considerar la instancia terminal
y construir otro objeto `SQL` si se necesita un nuevo ciclo de vida.

Los clientes dentro de una transacción rechazan `connect()`, `ping()`, `close()`
y `end()` antes de tocar el driver. El ciclo de vida pertenece al cliente raíz y
no debe cerrar la conexión reservada de una transacción. Cerrar recursos SQL
tampoco detiene ni drena el `Server` HTTP de S42-Core; eso continúa siendo una
responsabilidad separada del ciclo de vida del servidor.

## Errores normalizados del driver

Los fallos de base de datos provenientes de métodos estructurados,
`executeRaw()` y los ciclos de vida transaccional y de conexión se exponen
mediante la clase pública `SQLError`. El wrapper directo `SQLite` usa el mismo
contrato.

```ts
import { SQLError, isSQLError, type SQLErrorCode } from 's42-core'

class SQLError extends Error {
	readonly code: SQLErrorCode
	readonly dialect: 'postgres' | 'mysql' | 'sqlite'
	readonly nativeCode?: string | number
	readonly errno?: string | number
	readonly sqlstate?: string
	readonly constraint?: string
	readonly cause: unknown
}
```

`code` es la categoría estable de S42-Core. Las demás propiedades preservan la
metadata entregada por Bun y la base:

- `message` es el mensaje original del driver;
- `nativeCode` es el valor `code` original del driver, por ejemplo
  `ER_DUP_ENTRY` o `SQLITE_CONSTRAINT_UNIQUE`;
- `errno` conserva el `errno` string o numérico de Bun;
- `sqlstate` normaliza el `errno` de PostgreSQL y `sqlState` de MySQL cuando
  están disponibles;
- `constraint` se completa cuando el driver lo informa estructuradamente;
- `cause` es el objeto de error original.

Las categorías mapeadas son:

| Categoría               | Propósito                                                    |
| ----------------------- | ------------------------------------------------------------ |
| `unique_violation`      | Fallo de restricción única, clave primaria o row-id.         |
| `foreign_key_violation` | Fallo de foreign key referenciada o referente.               |
| `not_null_violation`    | Una columna requerida recibió null.                          |
| `check_violation`       | Fallo de una restricción `CHECK` de la base.                 |
| `duplicate_column`      | Columna existente cuando el motor entrega un código estable. |
| `duplicate_table`       | Tabla existente cuando el motor entrega un código estable.   |
| `serialization_failure` | Conflicto de serialización transaccional.                    |
| `deadlock_detected`     | Deadlock de PostgreSQL/MySQL.                                |
| `connection_failure`    | Fallo de conexión/apertura reconocido por códigos estables.  |
| `database_busy`         | SQLite ocupado/bloqueado o lock-wait de MySQL.               |
| `unknown`               | Fallo del driver sin clasificación portable soportada.       |

```ts
try {
	await sql.insert('wallet_bindings', binding)
} catch (error) {
	if (
		isSQLError(error, 'unique_violation') &&
		error.constraint === 'wallet_bindings_pkey'
	) {
		// Confirmar que la fila existente representa la misma operación idempotente.
		return
	}

	throw error
}
```

`isSQLError(error, code?)` es un type guard. Una violación única no demuestra
por sí sola que una operación sea un replay seguro; hay que verificar la
constraint esperada y los datos de la aplicación. S42-Core no reintenta
automáticamente: un fallo de serialización o deadlock exige repetir la
transacción completa, mientras que perder la conexión durante un commit puede
dejar un resultado ambiguo.

Los errores de validación generados antes de ejecutar el driver y los errores
lanzados por un callback de transacción/savepoint se conservan sin cambios.
SQLite informa columna y tabla duplicadas como `SQLITE_ERROR` genérico;
S42-Core los clasifica como `unknown` en lugar de parsear texto de mensajes que
puede variar.

El wrapper nunca agrega el texto de la query ni sus parámetros bindeados a
`SQLError`. El mensaje original y `cause` todavía pueden contener valores o
detalles de la base; no registrarlos ciegamente en servicios que procesan
secretos o datos personales.

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

Los índices por expresión quedan deliberadamente fuera de la API estructurada
de columnas porque sus expresiones, collations y clases de operadores dependen
del motor. Crearlos con `executeRaw()` desde código confiable de migraciones.
Administrar constraints formales de tabla mediante cláusulas confiables de
`alterTable()` o `executeRaw()`, sin esperar que `createIndex()` los infiera.

### `dropIndex(tableName, indexName, options?)`

```ts
type DropIndexOptions = {
	ifExists?: boolean
	concurrently?: boolean
}

dropIndex(
	tableName: string,
	indexName: string,
	options?: DropIndexOptions,
): Promise<void>
```

Elimina un índice independiente usando la sintaxis específica del adaptador. La
firma portable incluye `tableName` porque MySQL requiere
`DROP INDEX index_name ON table_name`; PostgreSQL y SQLite solo emiten el nombre
validado del índice.

```ts
await sql.dropIndex('products', 'idx_products_tenant_updated', {
	ifExists: true,
	concurrently: true,
})
```

Opciones:

| Opción         | Comportamiento                                                  |
| -------------- | --------------------------------------------------------------- |
| `ifExists`     | Default `true` en PostgreSQL/SQLite y `false` en MySQL.         |
| `concurrently` | Agrega `CONCURRENTLY` de PostgreSQL; no existe en MySQL/SQLite. |

MySQL rechaza `ifExists: true` porque su gramática nativa de `DROP INDEX` no
soporta esa cláusula. PostgreSQL exige ejecutar `DROP INDEX CONCURRENTLY` fuera
de una transacción. `dropIndex()` no agrega `CASCADE`; los índices pertenecientes
a constraints de primary key o unique deben administrarse mediante DDL de
constraints específico del motor con `alterTable()` o `executeRaw()`.

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

### `insert(tableName, data, options?)`

```ts
insert(tableName: string, data: KeyValueData): Promise<TypeReturnQuery | null>

insert<T = KeyValueData>(
	tableName: string,
	data: KeyValueData,
	options: InsertOptions,
): Promise<TypeReturningQuery<T> | null>
```

Inserta una fila con valores bindeados. Omitir `options` conserva exactamente
el contrato original: PostgreSQL ejecuta `RETURNING *` internamente,
SQLite/MySQL usan su metadata nativa de escritura y el resultado público no
tiene una propiedad `rows`.

```ts
type InsertOptions = {
	returning: readonly string[]
}

type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
	affectedRows?: number
}

type TypeReturningQuery<T> = TypeReturnQuery & {
	rows: T[]
}
```

`changes` y `affectedRows` contienen el mismo total normalizado.
`lastInsertRowId` puede ser `undefined` cuando el driver o la tabla no expone un
valor `id` o `ID`. En particular, una proyección `returning` de PostgreSQL que
omite el id no puede completar ese campo de metadata.

Pasar una lista `returning` no vacía permite recibir columnas seleccionadas de
PostgreSQL o SQLite sin una segunda query:

```ts
type InsertedUser = { id: number; created_at: Date }

const inserted = await sql.insert<InsertedUser>(
	'users',
	{ email: 'user@example.com' },
	{ returning: ['id', 'created_at'] },
)

console.log(inserted?.rows[0])
```

El resultado con opciones explícitas siempre incluye `rows`. Una lista vacía
omite deliberadamente la cláusula SQL `RETURNING` y devuelve `rows: []`; en
PostgreSQL este es el opt-out del costo de transferencia del `RETURNING *`
legacy:

```ts
const result = await sql.insert('audit_log', event, { returning: [] })
// result.rows === []
```

PostgreSQL y SQLite soportan un `returning` no vacío. MySQL no soporta la
cláusula, por lo que S42-Core rechaza una lista no vacía antes de ejecutar la
query; una lista vacía es válida y devuelve la metadata de escritura de MySQL
más `rows: []`.

Las columnas retornadas se validan como identificadores. `['*']` está permitido,
pero `*` no se puede combinar con columnas nombradas. Las expresiones y aliases
corresponden a `executeRaw()`.

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
- `$between: [inferior, superior]` inclusivo
- grupos recursivos `$and: [...]`, `$or: [...]` y `$not: {...}`

Los campos de primer nivel y los grupos lógicos se unen mediante `AND` implícito.
Los grupos se escriben entre paréntesis, y `$and`/`$or` requieren arrays no
vacíos de objetos de filtro no vacíos. `$not` requiere un objeto de filtro no
vacío y utiliza la lógica ternaria de SQL.

```ts
const visible = await sql.select<{ id: number }>({
	tableName: 'items',
	columns: ['id'],
	whereClause: {
		tenant_id: tenantId,
		deleted_at: null,
		$or: [
			{ status: 'active' },
			{
				status: 'pending',
				available_at: { $between: [windowStart, windowEnd] },
			},
		],
	},
})
```

Las comparaciones con null nunca bindean `NULL` mediante `=` o `!=`:

- `{ deleted_at: null }` y `{ deleted_at: { $eq: null } }` producen
  `deleted_at IS NULL`;
- `{ deleted_at: { $ne: null } }` produce `deleted_at IS NOT NULL`;
- null se rechaza en operandos de orden, `$like` y `$between`.

Los arrays de membresía se normalizan de forma consistente entre adaptadores:

- `$in: []` siempre es falso; `$nin: []` siempre es verdadero;
- `$in: [value, null]` incluye `field IS NULL` mediante `OR`;
- `$nin: [value, null]` incluye `field IS NOT NULL` mediante `AND`;
- cada elemento no nulo permanece como parámetro bindeado.

Los nombres de campos se validan como identificadores en cada nivel. Strings,
números, bigints, booleanos, `Date`, typed arrays y `null` directos son valores
escalares. Solamente objetos planos no vacíos se interpretan como mapas de
operadores. `undefined`, arrays directos, objetos de operadores vacíos, grupos
lógicos vacíos, operadores no soportados y operandos inválidos lanzan antes de
ejecutar SQL. Un `{}` vacío en el primer nivel se conserva por compatibilidad y
no genera `WHERE`; no pasarlo accidentalmente a `update()` o `delete()`.

`$like` requiere un string, pero su sensibilidad a mayúsculas sigue dependiendo
de la base y collation configuradas. `$ilike` y expresiones raw de campo como
`lower(email)` se mantienen deliberadamente fuera porque no son identificadores
portables. Para esos casos específicos del motor, usar `executeRaw()` con SQL
confiable y valores bindeados.

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

### Atomicidad, concurrencia y reintentos

Una transacción hace atómicas sus sentencias, pero no vuelve automáticamente
exclusiva una decisión de la aplicación ni hace idempotente un reintento. La
invariante debe formar parte del predicado de escritura y se debe verificar la
cantidad de filas afectadas, en lugar de leer primero y luego ejecutar un update
incondicional:

```ts
await sql.transaction(async transaction => {
	const changed = await transaction.update({
		tableName: 'invitation_codes',
		whereClause: { uuid, used_count: 0 },
		data: { used_count: 1 },
	})

	if (changed !== 1) {
		throw new Error('Invitation code is already used')
	}

	await transaction.insert('code_redemptions', {
		invitation_code_uuid: uuid,
		redeemed_by: userId,
	})
})
```

Los intentos concurrentes ejecutan la misma escritura condicional, pero solo
puede continuar el que modifica el estado esperado. Lanzar cuando `changed !== 1`
hace rollback de esa transacción. La invariante también debe estar respaldada
por una restricción de la base, por ejemplo un índice único sobre
`code_redemptions.invitation_code_uuid`; un fallo de esa restricción debe abortar
la transacción.

Cuando una invariante exige leer antes de escribir, usar un bloqueo específico
del motor, como `SELECT ... FOR UPDATE` mediante `transaction.executeRaw()`, o
una opción de aislamiento apropiada. Estos mecanismos no son portables a todos
los adaptadores; un `SELECT` común no impide que otra transacción modifique la
fila.

Todas las queries participantes deben usar el wrapper `transaction` con scope.
Una llamada mediante la instancia raíz `sql`, incluso desde un storage que la
haya retenido, se ejecuta fuera de esta transacción. Ese storage debe recibir el
wrapper con scope.

Las transacciones y los reintentos resuelven problemas diferentes. Si la base
hizo commit pero el caller no recibió la respuesta, un reintento todavía puede
repetir la operación; usar una clave de idempotencia o una clave única
determinística cuando ese resultado sea relevante. Las transacciones SQL tampoco
pueden incluir atómicamente Redis, HTTP u otros efectos externos; usar un outbox
u otro patrón explícito de coordinación.

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
- `close()`/`end()` liberan recursos SQL; no detienen el servidor HTTP.
- `dropTable()`, `dropColumn()`, `dropIndex()`, `alterTable()` y `delete()` sin
  filtro son operaciones destructivas aunque los identificadores se validen.
- `selectPaginate()` ejecuta dos sentencias separadas.
- La introspección de schema está normalizada y es deliberadamente incompleta.
- Los métodos estructurados parametrizados actualmente traducen los
  placeholders `?` generados separando la query para construir una llamada
  tagged-template de Bun. Un `?` literal en el mismo SQL generado puede
  desalinear el binding. `executeRaw()` no usa este puente y delega directamente
  en Bun.

## Referencias de Bun

- [Documentación Bun SQL](https://bun.sh/docs/runtime/sql)
- [`Bun.SQL.PostgresOrMySQLOptions`](https://bun.com/reference/bun/SQL/PostgresOrMySQLOptions)
- [`Bun.SQL.connect`](https://bun.com/reference/bun/SQL/connect)
- [`Bun.SQL.close`](https://bun.com/reference/bun/SQL/close)
- [`Bun.SQL.end`](https://bun.com/reference/bun/SQL/end)
- [`TransactionSQL.beginDistributed`](https://bun.com/reference/bun/TransactionSQL/beginDistributed)
- [Documentación dedicada de `bun:sqlite`](https://bun.sh/docs/runtime/sqlite)
- [Defaults de conexión de cliente PostgreSQL](https://www.postgresql.org/docs/current/runtime-config-client.html)
- [Códigos de error de PostgreSQL](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Referencia de errores del servidor MySQL](https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html)
- [Códigos de resultado y error de SQLite](https://www.sqlite.org/rescode.html)
