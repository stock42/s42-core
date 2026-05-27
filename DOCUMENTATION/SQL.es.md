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

## Seguridad de identificadores

Los valores de `whereClause`, `insert`, `update`, etc. siempre se envian al driver como
parametros (`?`). Los identificadores SQL (nombres de tabla/columna/campo y claves de `sort`)
no pueden parametrizarse, asi que desde `3.x` se validan contra una lista blanca estricta
(`[A-Za-z0-9_]`, con puntos para nombres calificados por esquema) antes de interpolar. Un
identificador invalido lanza error.

Es una proteccion **solo-validacion**: para cualquier identificador que ya era valido, el SQL
generado es byte-identico, por lo que las consultas legitimas siguen funcionando igual. Solo se
rechaza la entrada insegura. Nota: `columns` ya no acepta expresiones ni alias crudos (p. ej.
`COUNT(*) AS total`); pasa nombres de columna o `*`.

## Notas

- Mantener ownership de esquemas por modulo.
- Validar comportamiento SQL generado en los tres drivers antes de produccion.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
