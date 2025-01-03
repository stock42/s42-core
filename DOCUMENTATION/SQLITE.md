
- [SQLite Class Documentation](#sqlite-class-documentation)
	- [Key Features](#key-features)
	- [Installation](#installation)
	- [Usage Examples](#usage-examples)
		- [Initialization](#initialization)
		- [Creating and Managing Tables](#creating-and-managing-tables)
			- [Create a Table](#create-a-table)
			- [Drop a Table](#drop-a-table)
			- [Add Columns to an Existing Table](#add-columns-to-an-existing-table)
		- [CRUD Operations](#crud-operations)
			- [Insert Data](#insert-data)
			- [Select Data](#select-data)
			- [Update Data](#update-data)
			- [Delete Data](#delete-data)
		- [Indexing](#indexing)
			- [Create an Index](#create-an-index)
		- [Metadata Access](#metadata-access)
			- [Get All Tables](#get-all-tables)
			- [Get Table Schema](#get-table-schema)
	- [Advantages of Using the SQLite Class](#advantages-of-using-the-sqlite-class)
	- [Error Handling](#error-handling)
	- [License](#license)

# SQLite Class Documentation

The `SQLite` class is part of the `s42-core` package and provides a comprehensive and efficient interface for interacting with SQLite databases. It supports common operations like creating, updating, querying, and deleting data, as well as advanced features such as schema management, indexing, and MongoDB-style query translation.

## Key Features

- **Flexibility:** Support for both in-memory and file-based SQLite databases.
- **CRUD Operations:** Simplified methods for `INSERT`, `SELECT`, `UPDATE`, and `DELETE` operations.
- **Schema Management:** Create, drop, and alter tables dynamically.
- **Pagination Support:** Built-in `LIMIT` and `OFFSET` options for efficient query handling.
- **Indexing:** Create indexes to optimize query performance.
- **Metadata Access:** Retrieve a list of all tables and their schemas.
- **MongoDB-like Queries:** Translate MongoDB-style queries to SQL for seamless integration.
- **Error Handling:** Built-in validations and descriptive error messages to ensure reliability.

---

## Installation

To use the `SQLite` class, install the `s42-core` package:

```bash
npm install s42-core
```

---

## Usage Examples

### Initialization

```typescript
import { SQLite } from 's42-core';

// Create an in-memory database
const sqlite = new SQLite({ type: 'memory' });

// Create a file-based database
const sqliteFile = new SQLite({ type: 'file', filename: 'data.db' });
```

### Creating and Managing Tables

#### Create a Table
```typescript
await sqlite.createTable('users', {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  name: 'TEXT',
  age: 'INTEGER',
});
```

#### Drop a Table
```typescript
await sqlite.dropTable('users');
```

#### Add Columns to an Existing Table
```typescript
await sqlite.addTableColumns('users', {
  email: 'TEXT',
  isActive: 'BOOLEAN',
});
```

### CRUD Operations

#### Insert Data
```typescript
await sqlite.insert('users', { name: 'John Doe', age: 30 });
```

#### Select Data
```typescript
const users = await sqlite.select('users', ['id', 'name'], { age: { $gte: 18 } }, { name: 1 }, 10, 0);
console.log(users);
```

#### Update Data
```typescript
await sqlite.update('users', { id: 1 }, { name: 'Jane Doe', age: 28 });
```

#### Delete Data
```typescript
await sqlite.delete('users', { age: { $lt: 18 } });
```

### Indexing

#### Create an Index
```typescript
await sqlite.createIndex('users', 'name');
```

### Metadata Access

#### Get All Tables
```typescript
const tables = await sqlite.getAllTables();
console.log(tables);
```

#### Get Table Schema
```typescript
const schema = await sqlite.getTableSchema('users');
console.log(schema);
```

---

## Advantages of Using the SQLite Class

1. **Ease of Use:** Simplifies complex SQLite operations into a clean and intuitive API.
2. **Seamless Integration:** MongoDB-style query translation enables smooth integration with applications that use MongoDB-like query syntax.
3. **Performance Optimization:** Features like indexing and pagination ensure efficient data handling.
4. **Dynamic Schema Management:** Easily modify tables without manual SQL.
5. **Error Resilience:** Validations and detailed error messages help prevent and debug issues.
6. **Extensibility:** Built with flexibility to support additional features like transactions and batch operations.
7. **Real-Time Query Building:** Dynamically construct queries with filtering, sorting, and limiting.

---

## Error Handling

The class includes robust error handling:
- Ensures valid table and column names.
- Throws descriptive errors when operations fail.
- Logs errors to help debug issues effectively.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

