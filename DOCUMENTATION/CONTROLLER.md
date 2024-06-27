# CONTROLLER

- [CONTROLLER](#controller)
	- [Overview](#overview)
	- [Important Note](#important-note)
	- [Methods](#methods)
		- [`getMethods()`](#getmethods)
		- [`setPath(path: string)`](#setpathpath-string)
		- [`getPath()`](#getpath)
		- [`update()`](#update)
		- [`patch()`](#patch)
		- [`options()`](#options)
		- [`get()`](#get)
		- [`delete()`](#delete)
		- [`post()`](#post)
		- [`put()`](#put)
		- [`use(callback: (req: any, res: any, next?: Middleware) => void)`](#usecallback-req-any-res-any-next-middleware--void)
		- [`getCallback(): (req: any, res: any) => void`](#getcallback-req-any-res-any--void)
	- [Use Cases](#use-cases)
		- [Example 1: Setting Up a Controller with Multiple HTTP Methods](#example-1-setting-up-a-controller-with-multiple-http-methods)
		- [Example 2: Adding Middlewares](#example-2-adding-middlewares)

## Overview

The `Controller` class/module in `s42-core` provides a way to define and manage HTTP endpoints and their associated methods and middlewares. It is designed to be flexible and allows the attachment of various functionalities to each endpoint.

## Important Note

While the `Controller` class is a useful utility, it is not mandatory to use it with `s42-core`. The goal of `s42-core` is to be agnostic to any framework, providing the flexibility to integrate with any other system or framework you prefer.

## Methods

### `getMethods()`

Returns the list of HTTP methods associated with the controller.

### `setPath(path: string)`

Sets the path for the controller.

- **path**: The path to set for the controller.
- **returns**: The controller instance.

### `getPath()`

Returns the path set for the controller.

### `update()`

Adds the `UPDATE` HTTP method to the controller.

- **returns**: The controller instance.

### `patch()`

Adds the `PATCH` HTTP method to the controller.

- **returns**: The controller instance.

### `options()`

Adds the `OPTIONS` HTTP method to the controller.

- **returns**: The controller instance.

### `get()`

Adds the `GET` HTTP method to the controller.

- **returns**: The controller instance.

### `delete()`

Adds the `DELETE` HTTP method to the controller.

- **returns**: The controller instance.

### `post()`

Adds the `POST` HTTP method to the controller.

- **returns**: The controller instance.

### `put()`

Adds the `PUT` HTTP method to the controller.

- **returns**: The controller instance.

### `use(callback: (req: any, res: any, next?: Middleware) => void)`

Adds a middleware function to the controller. This method allows attaching various functionalities to the endpoint, but only one of these middlewares should send the final response to the client.

- **callback**: The middleware function to add.
- **returns**: The controller instance.

### `getCallback(): (req: any, res: any) => void`

Returns a callback function that processes the middlewares and sends the final response to the client.

## Use Cases

### Example 1: Setting Up a Controller with Multiple HTTP Methods

You can define a controller with multiple HTTP methods to handle different types of requests for a specific endpoint.

```typescript
import { Controller } from 's42-core'

export const userController = new Controller()
	.setPath('/users')
	.get()
	.use(async (req, res) => {
		res.json({users: []})
	})
```

### Example 2: Adding Middlewares

Attach various middleware functions to a controller to handle tasks such as authentication, validation, logging, etc. Remember, only one middleware should send the final response.

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
	.get()
	.post()
	.use(async (req, res, next) => {
		console.info('estoy de paso, soy un mws')
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
#Integrating with Other Frameworks

Since `s42-core` is agnostic to any framework, you can use the `Controller` class to manage your endpoints and integrate it seamlessly with any other framework or system you are using.


---

By utilizing the `Controller` class, you can define and manage your HTTP endpoints efficiently, leveraging the flexibility and power of `s42-core` to build robust and scalable applications.
