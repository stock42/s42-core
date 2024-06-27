# MONGODB

- [MONGODB](#mongodb)
	- [Overview](#overview)
	- [Recommended Usage](#recommended-usage)
	- [Methods](#methods)
		- [`connect()`](#connect)
		- [`ObjectId(id: string)`](#objectidid-string)
		- [`close()`](#close)
		- [`getDB()`](#getdb)
		- [`getCollection(colName: string)`](#getcollectioncolname-string)
		- [`getInstance({ connectionString: string, database: string })`](#getinstance-connectionstring-string-database-string-)
	- [Properties](#properties)
		- [`mongoClient`](#mongoclient)
		- [`db`](#db)
		- [`databaseName`](#databasename)
		- [`instance`](#instance)
	- [Examples](#examples)
		- [Example 1: Connecting to MongoDB and Storing the Instance in Dependencies](#example-1-connecting-to-mongodb-and-storing-the-instance-in-dependencies)
		- [Example 2: Accessing the MongoDB Instance from a Controller to Insert a User](#example-2-accessing-the-mongodb-instance-from-a-controller-to-insert-a-user)
	- [Additional Details](#additional-details)


## Overview

The `MongoClient` class/module in `s42-core` provides an interface for interacting with MongoDB databases. It offers methods to connect to the database, retrieve collections, and perform operations on the data.

## Recommended Usage

It is recommended to always call the `getInstance` method to get an instance of `MongoClient` instead of creating a new instance with the `new` operator. This ensures that there is a single instance managing the MongoDB connection, which is more efficient and reliable.

## Methods

### `connect()`

Establishes a connection to the MongoDB database. This method should be called before performing any database operations.

### `ObjectId(id: string)`

Converts a string to an `ObjectId`, which is used as a unique identifier for documents in MongoDB.

- **id**: The string to convert to an `ObjectId`.

### `close()`

Closes the MongoDB connection. This method should be called when the application is shutting down to ensure that all resources are properly released.

### `getDB()`

Returns the database instance that was connected. This can be used to perform database operations directly.

### `getCollection(colName: string)`

Retrieves a collection from the database.

- **colName**: The name of the collection to retrieve.

### `getInstance({ connectionString: string, database: string })`

Returns the singleton instance of `MongoClient`. If an instance does not already exist, it creates a new one.

- **connectionString**: The connection string for the MongoDB database.
- **database**: The name of the database to connect to.

## Properties

### `mongoClient`

The native MongoDB client instance.

### `db`

The database instance that was connected.

### `databaseName`

The name of the database.

### `instance`

The singleton instance of `MongoClient`.


## Examples

### Example 1: Connecting to MongoDB and Storing the Instance in Dependencies

In this example, we demonstrate how to connect to a MongoDB database using the `MongoClient` class and store the instance in the application's dependencies. This setup ensures that the MongoDB instance is easily accessible throughout the application.


```typescript
import { createServer } from 'node:http'

import {
	Shutdown,
	Cluster,
	Dependencies,
	MongoClient,
	RedisClient,
	EventsDomain,
} from 's42-core'

import { Router } from './routers.js'

const port = process.env.PORT ?? 3000

Cluster(
	1,
	async (pid, uuid) => {
		console.info('initializing: ', pid, uuid)
		const mongoClient = MongoClient.getInstance({
			connectionString: String(process.env?.MONGO_URI),
			database: String(process.env?.MONGO_DB),
		})

		await mongoClient.connect()
		const redisClient = RedisClient.getInstance('localhost')

		const eventsDomain = EventsDomain.getInstance(redisClient, uuid)

		Dependencies.add<MongoClient>('db', mongoClient)
		Dependencies.add<RedisClient>('redis', redisClient)
		Dependencies.add<EventsDomain>('eventsDomain', eventsDomain)
		const server = createServer(await Router())

		server.listen(port, () => {
			console.info(`ready on *:${port}`)
		})
		Shutdown([mongoClient.close, redisClient.close, eventsDomain.close])
	},
	() => {
		console.info('Error trying start servers')
	},
)

```

### Example 2: Accessing the MongoDB Instance from a Controller to Insert a User

In this example, we show how to access the MongoDB instance from a controller to perform an operation, such as inserting a new user into a collection. This demonstrates the practical use of the `MongoClient` instance within different parts of the application.

```typescript
import { type ServerResponse, type IncomingMessage } from 'node:http'
import { Dependencies, jsonParse, type MongoClient, type EventsDomain } from 's42-core'

type TypeUser = {
	firstName: string
	lastName: string
	email: string
}

export const UsersController = async () => {
	const db = Dependencies.get<MongoClient>('db') as MongoClient
	const eventsDomain = Dependencies.get<EventsDomain>('eventsDomain') as EventsDomain
	return async (req: IncomingMessage, res: ServerResponse) => {
		try {
			const data = (await jsonParse(req)) as TypeUser

			await db.getCollection('users').insertOne({
				...data,
				remoteIp: req.socket.remoteAddress,
				added: new Date(),
				headers: req.headers,
			})

			eventsDomain.emitEvent('users.created', { ...data })
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ ok: true }))
		} catch (error) {
			res.writeHead(400, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ ok: false, msg: String(error) }))
		}
	}
}

```

## Additional Details

The `MongoClient` class in `s42-core` simplifies the process of connecting to and interacting with MongoDB databases. By using the singleton pattern through the `getInstance` method, it ensures that there is only one active connection to the database at any time, which helps manage resources more efficiently.
