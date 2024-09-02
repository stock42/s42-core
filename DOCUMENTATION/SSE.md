
# SSE

- [SSE](#sse)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Key Features](#key-features)
	- [Methods](#methods)
		- [`constructor(req: IncomingMessage, res: ServerResponse)`](#constructorreq-incomingmessage-res-serverresponse)
			- [Usage](#usage)
		- [`getUUID(): string`](#getuuid-string)
			- [Usage](#usage-1)
		- [`send(data: TypeSSEventToSend)`](#senddata-typesseventtosend)
			- [Usage](#usage-2)
		- [`close()`](#close)
			- [Usage](#usage-3)
	- [Use Cases](#use-cases)
		- [Example: Basic SSE Setup](#example-basic-sse-setup)
	- [Browser implementation](#browser-implementation)
		- [Response after connected](#response-after-connected)

## Overview

The `SSE` class provides a simplified interface for handling Server-Sent Events (SSE) in a Node.js application. SSE allows servers to push updates to the client over an HTTP connection, ideal for real-time applications where data needs to be pushed from the server to the client without frequent polling.

## Purpose

The primary goal of the `SSE` class is to establish and manage an SSE connection, send events to the client, and handle the connection lifecycle, including closing the connection gracefully.

## Key Features

- **Automatic Connection Setup**: Sets up the response headers needed for SSE and sends an initial welcome event.
- **Event Sending**: Allows for sending custom events to the client.
- **Connection Management**: Handles the setup and teardown of SSE connections.
- **UUID Generation**: Generates a unique identifier for each SSE connection.

## Methods

### `constructor(req: IncomingMessage, res: ServerResponse)`

Initializes a new SSE connection by setting the appropriate headers and sending a welcome event to the client.

- **req**: The HTTP request object.
- **res**: The HTTP response object.

#### Usage

```javascript
const sse = new SSE(req, res);
```

### `getUUID(): string`

Returns the unique UUID associated with this SSE connection.

- **returns**: A string representing the UUID.

#### Usage

```javascript
const uuid = sse.getUUID();
console.log(`Connection UUID: ${uuid}`);
```

### `send(data: TypeSSEventToSend)`

Sends a custom event to the client over the established SSE connection.

- **data**: An object containing:
  - **eventName**: The name of the event to be sent.
  - **eventPayload**: An object containing the event data as key-value pairs.

#### Usage

```javascript
sse.send({
  eventName: 'update',
  eventPayload: { message: 'New update available!' },
});
```

### `close()`

Closes the SSE connection gracefully.

#### Usage

```javascript
sse.close();
```

## Use Cases

### Example: Basic SSE Setup

This example demonstrates how to set up a basic SSE connection and send events from a Node.js server.

```javascript
import { createServer } from 'http';
import { SSE } from './SSE'; // Import the SSE class from the appropriate path

const server = createServer((req, res) => {
  if (req.url === '/events') {
    const sse = new SSE(req, res);

    // Send an example event after the connection is established
    setTimeout(() => {
      sse.send({
        eventName: 'exampleEvent',
        eventPayload: { data: 'Hello, SSE!' },
      });
    }, 1000);

    // Close the connection after 5 seconds
    setTimeout(() => {
      sse.close();
    }, 5000);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
```

This example shows how to use the `SSE` class to establish a Server-Sent Events connection, send events, and close the connection after a certain period.


## Browser implementation
```javascript
const eventSource = new EventSource('/sse');
eventSource.addEventListener('event',  (event) => {
    const data = JSON.parse(event.data);
    console.info('from server: ',data)
});

eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    eventSource.close();
};
```

### Response after connected
The server side events controller will return a new event "welcome" with the `uuid` prop into "eventPayload".

```json
{
    "eventName": "welcome",
    "eventPayload": {
        "uuid": "1ceb707b-f57a-4645-a1f6-2c12575fb151"
    }
}
```