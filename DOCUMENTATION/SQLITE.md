
# SQLIte

- [SQLIte](#sqlite)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Key Features](#key-features)
	- [Methods](#methods)
		- [`constructor(props: TypeSQLiteConnection)`](#constructorprops-typesqliteconnection)
			- [Usage](#usage)
		- [`close()`](#close)
			- [Usage](#usage-1)
		- [`createTable(tableName: string, schema: TypeTableSchema)`](#createtabletablename-string-schema-typetableschema)
			- [Usage](#usage-2)
		- [`dropTable(tableName: string)`](#droptabletablename-string)
			- [Usage](#usage-3)
		- [`delete(tableName: string, where: string, params: any[])`](#deletetablename-string-where-string-params-any)
			- [Usage](#usage-4)
		- [`insert(tableName: string, data: { [key: string]: any })`](#inserttablename-string-data--key-string-any-)
			- [Usage](#usage-5)
		- [`select(tableName: string, where: string, params: any[])`](#selecttablename-string-where-string-params-any)
			- [Usage](#usage-6)
	- [Use Cases](#use-cases)
		- [Example: Basic SQLite Setup](#example-basic-sqlite-setup)

## Overview

The `SQLIte` class provides a simple interface for interacting with a SQLite database using Node.js. It supports both file-based and in-memory databases and provides basic methods for creating, dropping, inserting, deleting, and selecting data from tables.

## Purpose

The primary goal of the `SQLIte` class is to provide a convenient and type-safe wrapper around SQLite operations, allowing developers to interact with a SQLite database in a structured and secure manner.

## Key Features

- **Flexible Database Initialization**: Supports both file-based and in-memory SQLite databases.
- **CRUD Operations**: Provides methods for creating tables, inserting data, deleting data, and selecting data from tables.
- **Secure Query Handling**: Uses parameterized queries to prevent SQL injection.
- **Error Handling**: Includes robust error handling to manage database operations safely.

## Methods

### `constructor(props: TypeSQLiteConnection)`

Initializes a new SQLite connection based on the provided configuration.

- **props**: An object specifying the connection type ('file' or 'memory') and an optional filename for file-based databases.

#### Usage

```typescript
const db = new SQLIte({ type: 'file', filename: 'mydatabase.db' });
```

### `close()`

Closes the SQLite database connection.

#### Usage

```typescript
db.close();
```

### `createTable(tableName: string, schema: TypeTableSchema)`

Creates a new table with the specified name and schema.

- **tableName**: The name of the table to create.
- **schema**: An object representing the schema of the table, where the keys are column names and the values are column types.

#### Usage

```typescript
db.createTable('users', { username: 'TEXT', age: 'INTEGER' });
```

### `dropTable(tableName: string)`

Drops the table with the specified name if it exists.

- **tableName**: The name of the table to drop.

#### Usage

```typescript
db.dropTable('users');
```

### `delete(tableName: string, where: string, params: any[])`

Deletes rows from the specified table that match the given condition.

- **tableName**: The name of the table from which to delete rows.
- **where**: A SQL WHERE clause specifying the condition for deletion.
- **params**: An array of parameters to replace placeholders in the WHERE clause.

#### Usage

```typescript
db.delete('users', 'age > ?', [30]);
```

### `insert(tableName: string, data: { [key: string]: any })`

Inserts a new row into the specified table with the given data.

- **tableName**: The name of the table into which to insert the data.
- **data**: An object representing the data to insert, where the keys are column names and the values are the values to insert.

#### Usage

```typescript
db.insert('users', { username: 'Alice', age: 25 });
```

### `select(tableName: string, where: string, params: any[])`

Selects rows from the specified table that match the given condition.

- **tableName**: The name of the table from which to select rows.
- **where**: A SQL WHERE clause specifying the condition for selection.
- **params**: An array of parameters to replace placeholders in the WHERE clause.

#### Usage

```typescript
const users = db.select('users', 'age > ?', [20]);
console.log(users);
```

## Use Cases

### Example: Basic SQLite Setup

This example demonstrates how to set up a basic SQLite database and perform common operations using the `SQLIte` class.

```typescript
import { SQLIte } from './SQLIte'; // Import the SQLIte class from the appropriate path

const db = new SQLIte({ type: 'memory' });

// Create a new table
db.createTable('users', { username: 'TEXT', age: 'INTEGER' });

// Insert data into the table
db.insert('users', { username: 'Alice', age: 25 });
db.insert('users', { username: 'Bob', age: 30 });

// Select data from the table
const users = db.select('users', 'age > ?', [20]);
console.log(users);

// Delete data from the table
db.delete('users', 'age > ?', [30]);

// Drop the table
db.dropTable('users');

// Close the database connection
db.close();
```

This example shows how to use the `SQLIte` class to interact with a SQLite database in Node.js, including creating a table, inserting data, selecting data, deleting data, and dropping the table.
