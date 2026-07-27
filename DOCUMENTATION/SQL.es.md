# SQL

## Propósito

`SQL` ofrece una única API CRUD/schema sobre PostgreSQL, MySQL y SQLite.

Drivers:

- PostgreSQL/MySQL: `SQL` nativo de Bun.
- SQLite: `bun:sqlite`.

## Constructor

```ts
import { SQL } from 's42-core'

const sql = new SQL({
	type: 'postgres', // 'mysql' | 'sqlite'
	url: process.env.DATABASE_URL,
	tls: { rejectUnauthorized: true },
})
```

Para SQLite, `url` es el nombre del archivo y su default es `db.sqlite`. Usar
`:memory:` para una base en memoria. PostgreSQL/MySQL sin `url` usan los
defaults de entorno de Bun SQL.

## API

Schema:

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `dropTable(tableName)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `validateTableSchema(tableName, expectedSchema)`

Datos:

- `insert(tableName, data)`
- `select({ tableName, columns?, whereClause?, sort?, limit?, page? })`
- `selectPaginate({ tableName, columns?, whereClause?, sort?, limit?, page? })`
- `update({ tableName, whereClause, data })`
- `updateById(tableName, id, data)`
- `delete(tableName, whereClause?)`
- `deleteById(tableName, id)`
- `count({ tableName, whereClause? })`

`select()` usa por default `columns: ['*']`, `limit: 100` y `page: 1`.
`selectPaginate()` usa `limit: 10` y devuelve datos más el total.

## Filtros estilo Mongo

El export `translateMongoJsonToSql(query)` soporta:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

```ts
const products = await sql.select<{ id: number; name: string }>({
	tableName: 'products',
	whereClause: {
		enabled: true,
		price: { $gte: 100 },
	},
	sort: { added: -1 },
	page: 1,
	limit: 20,
})
```

## Seguridad de identificadores y valores

Los identificadores de tabla, columna, campo de filtro y sort se validan antes
de interpolar:

- segmento aceptado: `[A-Za-z0-9_]+`;
- se aceptan nombres calificados separados por puntos;
- `*` se acepta como proyección;
- expresiones y aliases como `COUNT(*) AS total` se rechazan.

Los valores de filtros y escrituras se envían como parámetros.

Los strings de tipos de schema son fragmentos DDL provistos por código confiable
de la aplicación y no se validan como identificadores. Nunca construirlos desde
input de requests.

Validar `page` y `limit` como números positivos y acotados en la frontera HTTP;
están tipados como números pero se renderizan en el SQL generado.

## Resultados de escritura

- `insert()` devuelve `{ lastInsertRowId?, changes, affectedRows }`.
- `update()` / `updateById()` devuelven el total de filas afectadas.
- `delete()` / `deleteById()` devuelven el total de filas afectadas.

`changes` y `affectedRows` contienen el mismo total normalizado.
`lastInsertRowId` puede ser `undefined` si el driver o tabla no expone `id`/`ID`.

## Restricción actual de placeholders PostgreSQL/MySQL

El puente de Bun SQL separa el query completo por `?` para construir una llamada
tagged-template. Un signo de pregunta literal dentro del SQL generado puede
desalinear parámetros.

Mantener la generación dentro de los helpers provistos y no incluir `?`
literales en fragmentos confiables de schema/tipos usados por esos queries. Para
eliminar esta limitación se requiere una futura abstracción de drivers.

## Notas

- Probar el comportamiento contra cada motor usado en producción; sus drivers
  devuelven formas de resultado diferentes.
- La clase no expone hoy un método público para cerrar la conexión.
- `dropTable()` y `delete()` sin filtro son destructivos; mantener nombres y
  filtros bajo control de código confiable.
