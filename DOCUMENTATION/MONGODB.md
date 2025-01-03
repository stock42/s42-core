# MONGODB

- [MONGODB](#mongodb)
- [MongoClient Class Documentation](#mongoclient-class-documentation)
	- [Features](#features)
	- [Installation](#installation)
	- [Example Usage](#example-usage)
		- [Basic Setup](#basic-setup)
		- [Pagination Example](#pagination-example)
	- [API Documentation](#api-documentation)
		- [Constructor](#constructor)
			- [`MongoClient.getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient`](#mongoclientgetinstanceconnection-typemongodbdatabaseconnection-mongoclient)
		- [Methods](#methods)
			- [`connect(): Promise<void>`](#connect-promisevoid)
			- [`close(): Promise<void>`](#close-promisevoid)
			- [`getDB(): Db`](#getdb-db)
			- [`getCollection<T>(colName: string): Collection<T>`](#getcollectiontcolname-string-collectiont)
			- [`ObjectId(id: string): ObjectId`](#objectidid-string-objectid)
			- [`paginate<T>(collection: Collection, query: object = {}, fields: object = {}, options: TypeMongoQueryPagination = {}): Promise<{ docs: T[]; count: number; limit: number; page: number; totalPages: number }>`](#paginatetcollection-collection-query-object---fields-object---options-typemongoquerypagination---promise-docs-t-count-number-limit-number-page-number-totalpages-number-)
	- [Error Handling](#error-handling)
		- [Connection Errors](#connection-errors)
		- [Pagination Errors](#pagination-errors)
	- [License](#license)

# MongoClient Class Documentation

The `MongoClient` class is a utility for managing MongoDB connections in Node.js applications. It implements a Singleton pattern to ensure a single database connection throughout the application and provides helper methods for common MongoDB operations.

---

## Features

- **Singleton Pattern:** Ensures a single instance of the MongoDB client.
- **Configurable Connection:** Supports environment variables and explicit configuration for connection strings and database names.
- **Database and Collection Access:** Provides helper methods to access the database and its collections.
- **Pagination Support:** Includes a utility for paginated queries.
- **Error Handling:** Logs and handles errors gracefully during connection and disconnection.

---

## Installation

Install the `s42-core` package required for the `MongoClient` class:

```bash
npm install s42-core
```

---

## Example Usage

### Basic Setup

```typescript
import { MongoClient } from 's42-core';

const mongoClient = MongoClient.getInstance({
  connectionString: 'mongodb://localhost:27017',
  database: 'myDatabase',
});

(async () => {
  await mongoClient.connect();

  const db = mongoClient.getDB();
  console.log('Connected to database:', db.databaseName);

  const usersCollection = mongoClient.getCollection('users');
  const users = await usersCollection.find().toArray();
  console.log('Users:', users);

  await mongoClient.close();
})();
```

### Pagination Example

```typescript
const usersCollection = mongoClient.getCollection('users');
const result = await MongoClient.paginate(usersCollection, { age: { $gt: 18 } }, {}, {
  page: 2,
  limit: 5,
  sort: { name: 1 },
});

console.log('Paginated Users:', result.docs);
console.log('Metadata:', {
  count: result.count,
  limit: result.limit,
  page: result.page,
  totalPages: result.totalPages,
});
```

---

## API Documentation

### Constructor

#### `MongoClient.getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient`

Returns the Singleton instance of the MongoClient class.

- **Parameters:**
  - `connection.connectionString` *(string)*: The MongoDB connection URI.
  - `connection.database` *(string)*: The name of the database.
- **Returns:**
  - *(MongoClient)*: The Singleton instance.

### Methods

#### `connect(): Promise<void>`

Establishes a connection to MongoDB.

- **Throws:**
  - An error if the connection fails.

#### `close(): Promise<void>`

Closes the MongoDB connection.

#### `getDB(): Db`

Retrieves the database instance.

- **Throws:**
  - An error if the connection has not been established.

#### `getCollection<T>(colName: string): Collection<T>`

Gets a collection from the connected database.

- **Parameters:**
  - `colName` *(string)*: The name of the collection.
- **Returns:**
  - *(Collection<T>)*: The collection instance.

#### `ObjectId(id: string): ObjectId`

Creates a MongoDB ObjectId.

- **Parameters:**
  - `id` *(string)*: The string representation of the ObjectId.
- **Throws:**
  - An error if the `id` is invalid.

#### `paginate<T>(collection: Collection, query: object = {}, fields: object = {}, options: TypeMongoQueryPagination = {}): Promise<{ docs: T[]; count: number; limit: number; page: number; totalPages: number }>`

Performs a paginated query on a collection.

- **Parameters:**
  - `collection` *(Collection<T>)*: The MongoDB collection.
  - `query` *(object, optional)*: The filter query.
  - `fields` *(object, optional)*: Fields to include or exclude.
  - `options` *(TypeMongoQueryPagination, optional)*: Pagination options, including:
    - `opts` *(object, optional)*: Additional query options.
    - `page` *(number, optional)*: The current page number (default: 1).
    - `limit` *(number, optional)*: The number of documents per page (default: 30).
    - `sort` *(object, optional)*: Sorting criteria (default: `{ added: -1 }`).
- **Returns:**
  - *(object)*: An object containing:
    - `docs` *(T[])*: The paginated documents.
    - `count` *(number)*: The total number of documents matching the query.
    - `limit` *(number)*: The number of documents per page.
    - `page` *(number)*: The current page number.
    - `totalPages` *(number)*: The total number of pages.

---

## Error Handling

### Connection Errors

The `connect` method logs and throws errors if the connection fails. Ensure to handle exceptions in your code to avoid crashes.

### Pagination Errors

The `paginate` method validates the `page` and `limit` parameters to ensure they are positive integers. If invalid values are provided, an error is thrown.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

