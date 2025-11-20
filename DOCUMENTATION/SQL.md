# SQL Abstraction Layer

This library provides a unified interface for interacting with **PostgreSQL**, **MySQL**, and **SQLite** databases using [Bun](https://bun.sh/). It abstracts the underlying differences between these databases, allowing you to write database-agnostic code.

## Features

- **Unified API**: Same methods for all supported databases.
- **Schema Management**: Create tables, add columns, create indexes.
- **CRUD Operations**: Insert, select, update, delete.
- **Pagination**: Built-in pagination support.
- **Mongo-like Querying**: Use a MongoDB-like syntax for `where` clauses.

## Installation

Ensure you have Bun installed.

```bash
bun install
```

## Usage

### Initialization

You can initialize the `SQL` class with the database type and connection details.

```typescript
import { SQL } from 's42-core'; // Adjust import path as needed

// SQLite
const db = new SQL({ type: 'sqlite', url: 'mydb.sqlite' });

// PostgreSQL
const pg = new SQL({
    type: 'postgres',
    url: 'postgres://user:pass@localhost:5432/mydb'
});

// MySQL
const mysql = new SQL({
    type: 'mysql',
    url: 'mysql://user:pass@localhost:3306/mydb'
});
```

### Creating a Table

```typescript
await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT', // SQLite syntax example
    // For Postgres: id: 'SERIAL PRIMARY KEY'
    name: 'TEXT',
    email: 'TEXT',
    age: 'INTEGER'
});
```

### Inserting Data

```typescript
const result = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
});

console.log(result.lastInsertRowId); // ID of the new user
```

### Selecting Data

You can use object syntax for arguments in `select` and `selectPaginate`.

```typescript
// Simple Select
const users = await db.select<User>({
    tableName: 'users',
    columns: ['id', 'name'],
    whereClause: { age: { $gte: 18 } }
});

// Pagination
const page = await db.selectPaginate<User>({
    tableName: 'users',
    page: 1,
    limit: 10,
    whereClause: { name: { $like: 'J%' } },
    sort: { name: 1 } // 1 for ASC, -1 for DESC
});

console.log(page.data);
console.log(page.total);
```

### Updating Data

```typescript
await db.update({
    tableName: 'users',
    whereClause: { id: 1 },
    data: { age: 31 }
});

// Or by ID directly
await db.updateById('users', 1, { age: 32 });
```

### Deleting Data

```typescript
await db.delete('users', { email: 'john@example.com' });

// Or by ID directly
await db.deleteById('users', 1);
```

## Query Syntax

The `whereClause` supports a subset of MongoDB query operators:

- `$eq`: Equal to
- `$gt`: Greater than
- `$gte`: Greater than or equal to
- `$lt`: Less than
- `$lte`: Less than or equal to
- `$ne`: Not equal to
- `$in`: In array
- `$nin`: Not in array
- `$like`: SQL LIKE operator

Example:

```typescript
const where = {
    age: { $gte: 18, $lte: 65 },
    status: { $in: ['active', 'pending'] },
    name: { $like: '%Smith%' }
};
```
