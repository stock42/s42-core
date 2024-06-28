
![s42-core](./DOCUMENTATION/s42-core.png)

# s42-core
- [s42-core](#s42-core)
	- [Overview](#overview)
	- [Key Features](#key-features)
		- [Microservices and Cells](#microservices-and-cells)
		- [Framework Agnostic](#framework-agnostic)
		- [High Performance](#high-performance)
		- [Simple Monorepo Management](#simple-monorepo-management)
	- [Use Cases](#use-cases)
		- [Creating a Monorepo](#creating-a-monorepo)
		- [Building Microservices](#building-microservices)
		- [Developing Atoms](#developing-atoms)
	- [Documentation](#documentation)
	- [Installation](#installation)
		- [Example Implementation for listen Events](#example-implementation-for-listen-events)
		- [Creating controllers](#creating-controllers)
		- [Using controllers](#using-controllers)
		- [Creating a Monorepo with Microservices](#creating-a-monorepo-with-microservices)

**Author**: César Casas
**LinkedIn**: [César Casas](https://www.linkedin.com/in/cesarcasas/)
**Website**: [s42core.com](https://s42core.com)

## Overview

`s42-core` is a powerful and flexible Node.js library designed to streamline the development of applications, particularly those utilizing microservices and cell-based architectures. The library simplifies the creation of monorepos and supports the development of small, reusable software components (atoms).

## Key Features

### Microservices and Cells

`s42-core` is built with microservices and cell-based architectures in mind, allowing you to create highly modular and scalable applications. Each microservice or cell can operate independently, facilitating easier maintenance and updates.

### Framework Agnostic

The classes provided by `s42-core` can be used independently and are agnostic to any specific framework. This means you can seamlessly integrate them with Express, Nest.js, Fastify, and other frameworks of your choice.

### High Performance

Applications developed with `s42-core` benefit from exceptional performance, making it suitable for high-demand environments.

### Simple Monorepo Management

Creating and managing a monorepo with `s42-core` is straightforward and efficient. The library encourages the creation of small, modular components that can be easily shared and reused across your projects.

## Use Cases

### Creating a Monorepo

`s42-core` simplifies the setup and management of monorepos, promoting code reuse and modular development. You can easily share common components and services across multiple projects within a single repository.

### Building Microservices

With `s42-core`, you can quickly develop microservices that are easy to deploy and maintain. The library provides essential utilities for handling HTTP requests, managing dependencies, and interacting with databases.

### Developing Atoms

The library supports the creation of small, reusable software components, or atoms, which can be combined to build more complex functionality. This approach enhances code maintainability and scalability.

## Documentation

For detailed information on each class and module provided by `s42-core`, refer to the following documentation files:

- [CLUSTER.md](./DOCUMENTATION/CLUSTER.md)
- [CONTROLLER.md](./DOCUMENTATION/CONTROLLER.md)
- [DEPENDENCIES.md](./DOCUMENTATION/DEPENDENCIES.md)
- [EVENTSDOMAIN.md](./DOCUMENTATION/EVENTSDOMAIN.md)
- [JSONPARSE.md](./DOCUMENTATION/JSONPARSE.md)
- [MONGODB.md](./DOCUMENTATION/MONGODB.md)
- [REDISDB.md](./DOCUMENTATION/REDISDB.md)
- [ROUTECONTROLLERS.md](./DOCUMENTATION/ROUTECONTROLLERS.md)
- [SHUTDOWN.md](./DOCUMENTATION/SHUTDOWN.md)
- [TEST.md](./DOCUMENTATION/TEST.md)

---

By leveraging `s42-core`, you can rapidly develop high-performance applications with a clean and modular architecture, integrating seamlessly with your existing frameworks and tools.

## Installation
Installing `s42-core` is simple. You can add it to your project using your preferred package manager.

```bash
npm install s42-core
```

### Example Implementation for listen Events
Here's a simple example of how to implement a microservice using s42-core:

```typescript
import { createServer } from 'node:http'

import { Shutdown, Cluster, EventsDomain, Dependencies, RedisClient } from 's42-core'

import { listenEventsDomain } from './eventsDomain/Listeners'

import { Router } from './routers.js'

Cluster(
	2,
	async (pid, uuid) => {
		console.info('initializing: ', pid, uuid)
		const redisInstance = RedisClient.getInstance(process.env.REDIS_URI)
		const eventsDomain = EventsDomain.getInstance(redisInstance, uuid)

		Dependencies.add<EventsDomain>('eventsDomain', eventsDomain)
		Dependencies.add<RedisClient>('redisInstance', redisInstance)

		listenEventsDomain(eventsDomain)

		const server = createServer(Router)
		server.listen(process.env.PORT, () =>
			console.info(`ready on *:${process.env.PORT} : PID: ${pid}`),
		)
		Shutdown([eventsDomain.close, redisInstance.close])
	},
	() => {
		console.info('Error trying start servers')
	},
)

```
*eventsDomain/Listeners*

```typescript
import { type EventsDomain } from 's42-core'

type UsersCreated = {
	email: string
	firstName: string
	lastName: string
	lang: 'en' | 'es' | 'it' | 'fr'
	template: string
}

export function listenEventsDomain(eventsDomain: EventsDomain) {
	eventsDomain.listenEvent<UsersCreated>(
		'users.created',
		async (payload: UsersCreated) => {
			try {
				console.info('Email sent successfully:', payload)
			} catch (error) {
				console.error('Error sending email:', error)
			}
		},
	)
}

```

### Creating controllers
```typescript
import { Dependencies, type MongoClient, type EventsDomain, Controller } from 's42-core'
import { z } from 'zod'

const TypeUser = z.object({
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().email(),
})

export const userController = new Controller()
	.setPath('/users/create')
	.post()
	.use(async (req, res, next) => {
		console.info('This is a mws: ', req.query)
		next()
	})
	.use(async (req, res) => {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		const eventsDomain = Dependencies.get<EventsDomain>('eventsDomain') as EventsDomain

		try {
			const data = req.body
			TypeUser.parse(data)
			await db.getCollection('users').insertOne({
				...data,
				remoteIp: req.realIp,
				added: new Date(),
				headers: req.headers,
			})

			eventsDomain.emitEvent('users.created', { ...data })
			res.json({ ok: true })
		} catch (error) {
			res.jsonError({ ok: false, msg: error })
		}
	})

```

### Using controllers
```typescript
import { createServer } from 'node:http'

import {
	Shutdown,
	Cluster,
	Dependencies,
	MongoClient,
	RedisClient,
	EventsDomain,
	RouteControllers,
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
		const redisClient = RedisClient.getInstance('localhost')

		const eventsDomain = EventsDomain.getInstance(redisClient, uuid)

		Dependencies.add<MongoClient>('db', mongoClient)
		Dependencies.add<RedisClient>('redis', redisClient)
		Dependencies.add<EventsDomain>('eventsDomain', eventsDomain)

		const routerControllers = RouteControllers.getInstance([
			userController,
			healthController,
		])
		const server = createServer(routerControllers.getCallback())

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


### Creating a Monorepo with Microservices

![s42-core monorepo](./DOCUMENTATION/ecosystem-using-s42-core.png)

s42-core is designed to work seamlessly within a monorepo. Here's a basic structure for a monorepo that includes multiple microservices:
```text
monorepo/
│
├── microservices/
│   ├── service1/
│   │   ├── package.json
│   │   └── src/
│   ├── service2/
│   │   ├── package.json
│   │   └── src/
│   └── service3/
│       ├── package.json
│       └── src/
│
├── package.json
├── tsconfig.json
└── README.md
```

For more detailed documentation, please refer to the individual markdown files listed above.

---

2024 César Casas - [LinkedIn](https://www.linkedin.com/in/cesarcasas/)
