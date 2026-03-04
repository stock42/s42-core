# SQLITE

## Purpose

`SQLite` is the direct `bun:sqlite` utility wrapper in S42-Core.

Use it for:

- local storage
- embedded service state
- low-latency single-node persistence

## Constructor

```ts
const db = new SQLite({ type: 'file', filename: './db.sqlite' })
// or
const mem = new SQLite({ type: 'memory' })
```

## Main API

- `createTable(tableName, schema)`
- `addTableColumns(tableName, changes)`
- `createIndex(tableName, columnName)`
- `dropTable(tableName)`
- `insert(tableName, data)`
- `select(tableName, columns?, where?, sort?, limit?, offset?)`
- `update(tableName, whereClause, data)`
- `delete(tableName, whereClause?)`
- `getAllTables()`
- `getTableSchema(tableName)`
- `close()`

## Query helper

`translateMongoJsonToSql(query)` is shared to map Mongo-like filters to SQL clauses.

## Example

```ts
const db = new SQLite({ type: 'file', filename: './ops.sqlite' })
db.createTable('operators', {
  uuid: 'text primary key',
  email: 'text',
})

await db.select('operators', ['uuid', 'email'], { email: { $like: '%@stock42.com' } })
```

## Notes

- Validate table/column identifiers before dynamic query interpolation.
- Prefer parameterized binds for runtime values.
- Close database on graceful shutdown.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
