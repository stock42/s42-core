# JSONPARSE

- [JSONPARSE](#jsonparse)
	- [Overview](#overview)
	- [Purpose](#purpose)
	- [Functionality](#functionality)
		- [Event-Driven Parsing](#event-driven-parsing)
		- [Error Handling](#error-handling)
	- [Usage Scenarios](#usage-scenarios)
		- [Handling API Requests](#handling-api-requests)
		- [Integrating with Controllers](#integrating-with-controllers)
		- [Validating Input](#validating-input)
	- [Example](#example)

## Overview

The `jsonParse` middleware in `s42-core` is designed to parse JSON bodies from incoming HTTP requests. It processes the request body, converting it from a raw string into a JavaScript object, which can then be used within your application.

## Purpose

The primary goal of the `jsonParse` middleware is to facilitate the handling of JSON data sent in HTTP requests. It ensures that the request body is correctly parsed into a usable format, allowing for easier manipulation and validation of the incoming data.

## Functionality

### Event-Driven Parsing

The `jsonParse` middleware leverages Node.js's event-driven architecture to read the request data. It listens for data chunks and accumulates them into a complete string representation of the body.

### Error Handling

The middleware includes robust error handling to manage scenarios where the request body is invalid or empty. If the body cannot be parsed into a valid JSON object, it rejects the promise with an error, ensuring that your application can handle these cases gracefully.

## Usage Scenarios

### Handling API Requests

Use the `jsonParse` middleware to handle JSON data in API requests, ensuring that incoming payloads are correctly parsed and validated before further processing.

### Integrating with Controllers

Integrate the `jsonParse` middleware with your controllers to seamlessly convert incoming request bodies into JavaScript objects, making it easier to access and manipulate the data.

### Validating Input

Utilize the parsed JSON data to perform validation checks, ensuring that the incoming data meets the required schema and format for your application's needs.

## Example
```typescript
import { type IncomingMessage, type ServerResponse } from 'node:http'
import { jsonParse } from 's42-core'

import { type TypeServerResponse, type TypeIncomingFile } from '../types'

export const controllerUpload = async (req: IncomingMessage, res: ServerResponse) => {
	const jsonData: TypeIncomingFile = await jsonParse(req)
	console.info('jsonData: ', jsonData)
	res.end(
		JSON.stringify({
			ok: true,
		} as TypeServerResponse),
	)
}

```

---

By incorporating the `jsonParse` middleware into your `s42-core` application, you can efficiently manage and process JSON data from incoming HTTP requests, enhancing the robustness and reliability of your application's data handling capabilities.
