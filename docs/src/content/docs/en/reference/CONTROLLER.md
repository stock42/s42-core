---
title: S42-Core Controller Class
description: Using controllers from s42-core
---


- [Controller Documentation](#controller-documentation)
	- [Purpose](#purpose)
	- [Installation](#installation)
	- [Usage](#usage)
		- [Basic Example](#basic-example)
		- [Adding Middlewares](#adding-middlewares)
		- [Handling Multiple Methods](#handling-multiple-methods)
		- [Dynamic Parameters](#dynamic-parameters)
	- [Key Methods](#key-methods)
		- [Constructor](#constructor)
		- [`getPath(): string`](#getpath-string)
		- [`getMethods(): TYPE_HTTP_METHOD[]`](#getmethods-type_http_method)
		- [`use(callback: Middleware): this`](#usecallback-middleware-this)
		- [HTTP Methods](#http-methods)
		- [`getCallback(): (req: Request, res: Res) => Promise<Response>`](#getcallback-req-request-res-res--promiseresponse)
	- [Example Integration with RouteControllers](#example-integration-with-routecontrollers)
	- [Features](#features)
	- [Advantages](#advantages)
	- [License](#license)

# Controller Documentation

The `Controller` class is part of the `s42-core` package and provides an intuitive and flexible way to define endpoints for HTTP requests. It supports dynamic routing, middleware chaining, and multiple HTTP methods for each path.

This class is designed to work seamlessly with the `RouteControllers` class to manage application routes efficiently.

---

## Purpose

The `Controller` class:

- Simplifies defining HTTP endpoints.
- Supports middlewares for processing requests.
- Handles multiple HTTP methods for a single endpoint.
- Allows dynamic parameterized routes.

---

## Installation

Install the `s42-core` package:

```bash
npm install s42-core
```

---

## Usage

### Basic Example

```typescript
import { Controller } from 's42-core';

const helloController = new Controller('GET', '/hello', async (req, res) => {
  return res.json({ message: 'Hello, World!' });
});
```

### Adding Middlewares

You can chain multiple middlewares for preprocessing the request. Middlewares are executed in order and can optionally return a `Response`. If a middleware returns `undefined`, the next middleware in the chain is executed.

```typescript
helloController.use(async (req, res) => {
  req.timestamp = Date.now(); // Add custom data to the request
});

helloController.use(async (req, res) => {
  console.info(`Request received at: ${req.timestamp}`);
});
```

### Handling Multiple Methods

You can add multiple HTTP methods for a single controller.

```typescript
helloController.post();
helloController.delete();
```

This allows the same path `/hello` to handle `GET`, `POST`, and `DELETE` requests.

### Dynamic Parameters

Define dynamic routes with parameters:

```typescript
const userController = new Controller('GET', '/users/:userId', async (req, res) => {
  return res.json({ userId: req.params.userId });
});
```

The `req.params` object contains the dynamic parameters parsed from the URL.

---

## Key Methods

### Constructor

```typescript
constructor(method: TYPE_HTTP_METHOD, path: string, callback: Middleware);
```

- **`method`**: The HTTP method for the route (e.g., `GET`, `POST`).
- **`path`**: The route path (e.g., `/users/:userId`).
- **`callback`**: The primary middleware for handling the request.

### `getPath(): string`
Returns the path associated with the controller.

### `getMethods(): TYPE_HTTP_METHOD[]`
Returns an array of HTTP methods supported by the controller.

### `use(callback: Middleware): this`
Adds a middleware to the controller. Middlewares are executed in the order they are added.

### HTTP Methods

These methods allow adding HTTP methods to the controller:

- `get()`: Adds `GET` method.
- `post()`: Adds `POST` method.
- `delete()`: Adds `DELETE` method.
- `put()`: Adds `PUT` method.
- `patch()`: Adds `PATCH` method.
- `options()`: Adds `OPTIONS` method.
- `update()`: Adds `UPDATE` method.

### `getCallback(): (req: Request, res: Res) => Promise<Response>`
Returns a callback function that handles the incoming request. The function executes the middleware chain and returns a `Response`.

---

## Example Integration with RouteControllers

The `Controller` class is designed to work with `RouteControllers`. Here's an example:

```typescript
import { Controller, RouteControllers, Server } from 's42-core';

const helloController = new Controller('GET', '/hello', async (req, res) => {
  return res.json({ message: 'Hello, World!' });
});

const userController = new Controller('GET', '/users/:userId', async (req, res) => {
  return res.json({ userId: req.params.userId });
});

const routeControllers = new RouteControllers([
  helloController,
  userController,
]);

const server = new Server();
await server.start({
  port: 3000,
  RouteControllers: routeControllers,
});

console.info('Server running at:', server.getURL());
```

---

## Features

1. **Dynamic Routing**: Supports static, dynamic, and wildcard routes.
2. **Middleware Support**: Enables layered request processing.
3. **Flexible Methods**: Easily handle multiple HTTP methods for a single path.
4. **Integration-Ready**: Designed to work with `RouteControllers` for efficient routing.

---

## Advantages

- **Modular**: Allows defining endpoints as self-contained modules.
- **Chainable**: Add multiple methods and middlewares fluently.
- **Error Handling**: Includes robust error handling for middleware chains.
- **Dynamic Parameters**: Supports parameterized routes for flexible routing.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

