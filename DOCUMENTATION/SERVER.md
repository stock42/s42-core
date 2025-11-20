- [Server Class Documentation](#server-class-documentation)
	- [Overview](#overview)
	- [Features](#features)
	- [Constructor](#constructor)
	- [Methods](#methods)
		- [start(properties: TypeServerConstructor): Promise](#startproperties-typeserverconstructor-promise)
			- [Parameters:](#parameters)
			- [Example:](#example)
		- [getPort(): number | undefined](#getport-number--undefined)
		- [getURL(): string | undefined](#geturl-string--undefined)
		- [isStartedFromCluster(): boolean](#isstartedfromcluster-boolean)
		- [getClusterName(): string](#getclustername-string)
		- [sendMessageToCluster(message: string): void](#sendmessagetoclustermessage-string-void)
		- [sendMessageToWorkers(message: string): void](#sendmessagetoworkersmessage-string-void)
		- [onMessageFromWorkers(callback: (message: string) =\> void): void](#onmessagefromworkerscallback-message-string--void-void)
	- [Example Implementation](#example-implementation)
	- [Static Content](#static-content)
	- [Error Handling](#error-handling)
	- [Cluster Communication](#cluster-communication)
		- [Sending a Message to the Cluster](#sending-a-message-to-the-cluster)
		- [Receiving Messages from Workers](#receiving-messages-from-workers)
	- [Notes](#notes)
	- [License](#license)


# Server Class Documentation

## Overview

The `Server` class is a robust implementation for managing HTTP servers using Bun.js. It supports clustering, hooks, customizable request handling, and error management. This documentation provides an overview of its features, configuration options, and an example implementation.

---

## Features

- **Clustering Support**: Distributes load across multiple processes.
- **Hooks**: Allows adding custom hooks to extend functionality.
- **Error Handling**: Customizable error responses.
- **Dynamic Routing**: Integrates with `RouteControllers` for handling routes.
- **Cluster Communication**: Facilitates communication between workers and clusters.
- **Health Check**: Includes a static `/health-check` endpoint.
- **Configurable Settings**: Supports customization of timeout, body size, and development options.

---

## Constructor

```typescript
constructor()
```
- Initializes the `Server` instance and listens for cluster communication messages.

---

## Methods

### start(properties: TypeServerConstructor): Promise<void>
Starts the server with the specified configuration.

#### Parameters:
- **port** (number): The port on which the server listens. Default is `0`.
- **clustering** (boolean): Enables port reuse for clustering. Default is `false`.
- **idleTimeout** (number): The maximum idle time in seconds before a connection is closed. Default is `300`.
- **maxRequestBodySize** (number): The maximum size (in bytes) of the request body. Default is `1,000,000`.
- **error** (function): Custom error handler. Receives an `Error` object and returns a `Response`.
- **hooks** (TypeHook[]): Array of hooks to execute during server operations.
- **RouteControllers** (RouteControllers): Handles routes and their corresponding logic.
- **development** (boolean): Indicates if the server is running in development mode. Default is `false`.
- **awaitForCluster** (boolean): Delays server startup until the cluster communication is established. Default is `false`.

#### Example:
```typescript
import { Server, RouteControllers, Controller } from 's42-core'
(async function startServer() {
	let x =0
	const hello = new Controller('GET', '/hello', async (req, res) => {
		console.info('Hello World!')
		return res.send(`Hello World! ${x++}`)
	})

  console.info("S42-Core Framework running...")
  const apiServer = new Server()
	await apiServer.start({
		port: parseInt(String(process?.env?.PORT ?? 5678), 10),
		clustering: true,
		idleTimeout: 30,
		maxRequestBodySize: Number.MAX_SAFE_INTEGER,
		development: true,
		awaitForCluster: true,
		hooks: [
			{
				method: '*',
				path: '*',
				when: 'before',
				handle: (req, res, next) => {
					console.info('Before all request')
					next(req, res)
				}
			},
			{
				method: '*',
				path: '*',
				when: 'after',
				handle: (req, res, next) => {
					console.info('Thanks for your visit')
					next(req, res)
				}
			}
		],
		RouteControllers: new RouteControllers([hello]),
	})
	console.info(`🚀 API Running on port ${process?.env?.PORT ?? 5678}`)
})()
```

### getPort(): number | undefined
Returns the port on which the server is running.

### getURL(): string | undefined
Returns the full URL of the server.

### isStartedFromCluster(): boolean
Indicates if the server was started as part of a cluster.

### getClusterName(): string
Returns the name of the cluster the server belongs to.

### sendMessageToCluster(message: string): void
Sends a message to the parent cluster.

### sendMessageToWorkers(message: string): void
Sends a message to all worker processes.

### onMessageFromWorkers(callback: (message: string) => void): void
Registers a callback to handle messages received from worker processes.

---

## Example Implementation

Below is an example of how to use the `Server` class along with `RouteControllers`:

```typescript
import { Server, RouteControllers, Controller } from 's42-core';

const server = new Server();

const myTestController = new Controller('*', '/test', async (req, res) => {
  res.json({ test: 'test' });
});

await server.start({
  port: parseInt(String(process?.env?.PORT ?? 4555), 10),
  clustering: true,
  idleTimeout: 30,
  maxRequestBodySize: 1024 * 1024 * 10,
  development: true,
  awaitForCluster: true,
  RouteControllers: new RouteControllers([
    myTestController,
  ]),
});
```

---

## Static Content

- The server includes a default static route for health checks:
  - URL: `/health-check`
  - Response: `"All good!"`

---

## Error Handling

Custom error responses can be defined via the `error` property:

```typescript
await server.start({
  error: (err) => new Response(`<pre>${err.message}\n${err.stack}</pre>`, {
    headers: { 'Content-Type': 'text/html' },
  }),
});
```

---

## Cluster Communication

The server supports communication between clusters and workers. Example:

### Sending a Message to the Cluster
```typescript
server.sendMessageToCluster('Cluster started!');
```

### Receiving Messages from Workers
```typescript
server.onMessageFromWorkers((message) => {
  console.log('Message from worker:', message);
});
```

---

## Notes
- Ensure the `RouteControllers` instance is properly configured to handle routes.
- Use the `clustering` option for high availability and scalability.
- Utilize hooks for adding middleware or pre-processing logic.

---

## License

This project is licensed under the MIT License. For more information, see the LICENSE file.

