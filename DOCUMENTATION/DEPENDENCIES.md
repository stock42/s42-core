# DEPENDENCIES
- [DEPENDENCIES](#dependencies)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Methods](#methods)
		- [`add<DEP>(name: string, dep: DEP): void`](#adddepname-string-dep-dep-void)
		- [`get<DEP>(name: string): DEP | null`](#getdepname-string-dep--null)
	- [Examples of Usage](#examples-of-usage)
		- [Example 1: Storing a Database Connection](#example-1-storing-a-database-connection)
		- [Example 2: Sharing Configuration Settings](#example-2-sharing-configuration-settings)
		- [Example 3: Managing Service Instances](#example-3-managing-service-instances)
	- [Additional Details](#additional-details)


## Overview

The `Dependencies` class/module in `s42-core` is designed to store instances or resources that will be shared across a microservice, module, or software component. This class provides a simple but effective way to manage dependencies, making them easily accessible throughout the application.

## Purpose

The primary goal of the `Dependencies` class is to allow for the storage and retrieval of shared instances or resources. This is particularly useful in scenarios where multiple parts of an application need to access the same instance or resource, such as database connections, configuration settings, or service instances.

## Methods

### `add<DEP>(name: string, dep: DEP): void`

Adds a dependency to the storage.

- **name**: The name of the dependency.
- **dep**: The instance of the dependency to store.

### `get<DEP>(name: string): DEP | null`

Retrieves a dependency from the storage.

- **name**: The name of the dependency.
- **returns**: The instance of the dependency if it exists, or `null` if it does not.

## Examples of Usage

### Example 1: Storing a Database Connection

You can store a database connection instance in the `Dependencies` class so that it can be easily accessed throughout your application.

```typescript
import { createServer } from 'node:http'

import {
	Shutdown,
	Cluster,
	Dependencies,
	MongoClient,
} from 's42-core'

import { userController, healthController } from './controllers'

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

		Dependencies.add<MongoClient>('db', mongoClient)

		Shutdown([mongoClient.close, redisClient.close, eventsDomain.close])
	},
	() => {
		console.info('Error trying start servers')
	},
)

```

### Example 2: Sharing Configuration Settings

Store configuration settings that multiple components or modules need to access.

```typescript
import { createServer } from 'node:http'
import { AppConfiguration } from './appconfiguration.js'
import {
	Shutdown,
	Cluster,
	Dependencies,
} from 's42-core'

import { userController, healthController } from './controllers'

const port = process.env.PORT ?? 3000

Cluster(
	1,
	async (pid, uuid) => {
		console.info('initializing: ', pid, uuid)
		Dependencies.add<AppConfiguration>('config', AppConfiguration)

		Shutdown([mongoClient.close, redisClient.close, eventsDomain.close])
	},
	() => {
		console.info('Error trying start servers')
	},
)
```

### Example 3: Managing Service Instances

Store instances of services that are used across different parts of the application, such as logging services, authentication services, or caching services.

## Additional Details

The `Dependencies` class is a very simple but useful utility for managing shared resources within an application. By centralizing the storage and retrieval of these resources, it helps to maintain clean and organized code, reducing the need for passing instances or configurations through multiple layers of the application.
