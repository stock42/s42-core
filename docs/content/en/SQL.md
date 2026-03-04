# SQL

## Purpose

`SQL` provides a unified interface for PostgreSQL, MySQL, and SQLite in S42-Core.

It supports:

- schema creation and migration helpers
- CRUD helpers
- filtering via Mongo-like query syntax
- pagination

## Constructor

```ts
const sql = new SQL({
  type: 'postgres', // 'mysql' | 'sqlite'
  url: process.env.DB_URL,
})
```

## Main API

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

## Query translation helper

`translateMongoJsonToSql(query)` converts operators like:

- `$eq`, `$ne`
- `$gt`, `$gte`, `$lt`, `$lte`
- `$in`, `$nin`
- `$like`

into SQL `WHERE` clauses and parameter arrays.

## Example

```ts
const products = await sql.select<{ id: number; name: string }>({
  tableName: 'products',
  whereClause: { enabled: true, price: { $gte: 100 } },
  sort: { added: -1 },
  page: 1,
  limit: 20,
})
```

## Notes

- Keep table/column naming sanitized before interpolation.
- Use strict schema ownership per module.
- Validate generated SQL behavior across all three drivers before production.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
