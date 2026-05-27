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

## Identifier safety

Values passed to `whereClause`, `insert`, `update`, etc. are always sent to the driver as
bound parameters (`?`). SQL identifiers (table/column/field names and `sort` keys) cannot be
bound, so since `3.x` they are validated against a strict allow-list (`[A-Za-z0-9_]`,
dot-separated for schema-qualified names) before interpolation. Invalid identifiers throw.

This is a **validate-only** safeguard: for any identifier that was already valid the generated
SQL is byte-identical, so legitimate queries keep working unchanged. Only unsafe input is
rejected. Note that `columns` no longer accepts raw expressions or aliases (e.g.
`COUNT(*) AS total`); pass plain column names or `*`.

## Write return values

`insert`, `update` and `delete` normalize the heterogeneous driver results into stable values:

- `insert` returns `{ lastInsertRowId?, changes, affectedRows }`.
- `update` / `delete` return the number of affected rows.

`changes` and `affectedRows` carry the same affected-row count (both exposed for
compatibility). `lastInsertRowId` may be `undefined` when the driver/table cannot report it
(e.g. a table without an `id`/`ID` column on Postgres). Normalization lives in
`src/SQL/results.ts`.

## Notes

- Use strict schema ownership per module.
- Validate generated SQL behavior across all three drivers before production.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
