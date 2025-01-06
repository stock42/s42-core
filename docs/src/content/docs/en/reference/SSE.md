---
title: S42Core SSE Class
description: The SSE class provides a simplified interface for handling Server-Sent Events (SSE) in a Node.js application
---
- [SSE - s42-core](#sse---s42-core)
	- [Purpose](#purpose)
	- [Installation](#installation)
	- [Features](#features)
	- [Usage](#usage)
		- [Setting Up SSE in a Controller](#setting-up-sse-in-a-controller)
		- [Sending Events](#sending-events)
	- [Example Scenario](#example-scenario)
		- [Use Case: Real-Time Notifications](#use-case-real-time-notifications)
			- [Client-Side Example (JavaScript)](#client-side-example-javascript)
	- [Methods](#methods)
		- [Constructor](#constructor)
		- [`getResponse(): Response`](#getresponse-response)
		- [`getUUID(): string`](#getuuid-string)
		- [`send(data: TypeSSEventToSend): void`](#senddata-typesseventtosend-void)
		- [`close(): void`](#close-void)
	- [Integration with s42-core](#integration-with-s42-core)
	- [Advantages](#advantages)
	- [License](#license)

# SSE - s42-core

The `SSE` (Server-Sent Events) class from the `s42-core` package simplifies the creation of real-time communication streams in web applications. It provides an easy way to send events from the server to connected clients using the Server-Sent Events protocol.

---

## Purpose

`SSE` is designed for real-time, one-way communication from the server to the client. It is particularly useful for scenarios like:

- Live notifications (e.g., new messages, system updates)
- Real-time monitoring (e.g., stock prices, server health)
- Event broadcasting (e.g., user activity in collaborative applications)

---

## Installation

Install the `s42-core` package:

```bash
npm install s42-core
```

---

## Features

1. **Real-Time Communication**: Send server events to clients with minimal overhead.
2. **Event Broadcasting**: Broadcast events to multiple clients simultaneously.
3. **Ease of Use**: Straightforward API to manage connections and send events.
4. **Integration with Controllers**: Works seamlessly with `Controller` and `RouteControllers` classes.

---

## Usage

### Setting Up SSE in a Controller

```typescript
import { SSE, Controller, RouteControllers, Server } from 's42-core';

// Map to store SSE listeners
const sseListeners = new Map<string, Function>();

// SSE Controller
const sseController = new Controller('GET', '/sse', async (req, res) => {
  const sse = new SSE(req);
  sseListeners.set(sse.getUUID(), (eventName: string, eventPayload: Record<string, any>) => {
    sse.send({ eventName, eventPayload });
  });

  return sse.getResponse();
});

// Sample 404 Controller
const controller404 = new Controller('*', '*', async (req, res) => {
  console.info('404 - No matching route');
  sseListeners.forEach((listener, uuid) => {
    listener('404', { url: req.url });
  });

  return res.text('Not Found');
});

// Start the server
(async () => {
  const server = new Server();

  await server.start({
    port: 4555,
    RouteControllers: new RouteControllers([
      sseController,
      controller404,
    ]),
  });

  console.info(`Server started at port: ${server.getPort()}`);
})();
```

---

### Sending Events

To broadcast events to all connected clients:

```typescript
sseListeners.forEach((listener) => {
  listener('event_name', { message: 'Hello, World!' });
});
```

---

## Example Scenario

### Use Case: Real-Time Notifications

1. **Client Connection**: Clients connect to the `/sse` endpoint to establish an SSE connection.
2. **Broadcasting Events**: The server broadcasts events (e.g., new notifications) to all connected clients.

#### Client-Side Example (JavaScript)

```javascript
const eventSource = new EventSource('/sse');

eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
};

eventSource.addEventListener('event_name', (event) => {
  console.log('Custom Event:', JSON.parse(event.data));
});
```

---

## Methods

### Constructor

```typescript
constructor(req: Request)
```

- **`req`**: The `Request` object from the incoming HTTP request.

### `getResponse(): Response`

Returns the `Response` object to send back to the client.

### `getUUID(): string`

Returns a unique identifier for the SSE instance.

### `send(data: TypeSSEventToSend): void`

Sends an event to the connected client.

- **`data`**: An object containing:
  - `eventName`: The name of the event.
  - `eventPayload`: The payload of the event.

### `close(): void`

Closes the SSE connection.

---

## Integration with s42-core

The `SSE` class works seamlessly with the `Controller`, `RouteControllers`, and `Server` classes from the `s42-core` package. It is designed to fit into your application's architecture effortlessly.

---

## Advantages

- **Lightweight**: Minimal setup for real-time communication.
- **Scalable**: Efficiently handles multiple connections.
- **Simple API**: Intuitive methods to manage SSE connections.
- **Event Flexibility**: Supports custom events and data payloads.

---

## License

This project is licensed under the MIT License. See the LICENSE file for more details.