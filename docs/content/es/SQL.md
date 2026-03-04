# SQL

## Proposito

`SQL` ofrece una interfaz unificada para PostgreSQL, MySQL y SQLite en S42-Core.

Soporta:

- helpers de esquema y migracion
- helpers CRUD
- filtros con sintaxis tipo Mongo
- paginacion

## Constructor

```ts
const sql = new SQL({
  type: 'postgres', // 'mysql' | 'sqlite'
  url: process.env.DB_URL,
})
```

## API principal

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `validateTableSchema(tableName, expectedSchema)`
- `insert(tableName, data)`
- `select({ ... })`
- `selectPaginate({ ... })`
- `update({ tableName, whereClause, data })`
- `delete(tableName, whereClause?)`
- `count({ tableName, whereClause? })`
- `dropTable(tableName)`

## Helper de traduccion

`translateMongoJsonToSql(query)` convierte operadores:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

en clausulas SQL `WHERE` con arrays de parametros.

## Ejemplo

```ts
const products = await sql.select<{ id: number; name: string }>({
  tableName: 'products',
  whereClause: { enabled: true, price: { $gte: 100 } },
  sort: { added: -1 },
  page: 1,
  limit: 20,
})
```

## Notas

- Sanitizar nombres de tabla/columna antes de interpolar.
- Mantener ownership de esquemas por modulo.
- Validar comportamiento SQL generado en los tres drivers antes de produccion.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
