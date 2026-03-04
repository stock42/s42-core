# SQLITE

## Proposito

`SQLite` es el wrapper utilitario directo sobre `bun:sqlite` en S42-Core.

Se usa para:

- almacenamiento local
- estado embebido del servicio
- persistencia de baja latencia en nodo unico

## Constructor

```ts
const db = new SQLite({ type: 'file', filename: './db.sqlite' })
// o
const mem = new SQLite({ type: 'memory' })
```

## API principal

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

## Helper de query

`translateMongoJsonToSql(query)` se comparte para mapear filtros tipo Mongo a clausulas SQL.

## Ejemplo

```ts
const db = new SQLite({ type: 'file', filename: './ops.sqlite' })
db.createTable('operators', {
  uuid: 'text primary key',
  email: 'text',
})

await db.select('operators', ['uuid', 'email'], { email: { $like: '%@stock42.com' } })
```

## Notas

- Validar identificadores de tabla/columna antes de interpolar.
- Preferir binds parametrizados para valores dinamicos.
- Cerrar base en shutdown graceful.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
