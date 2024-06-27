# TEST

- [TEST](#test)
	- [Overview](#overview)
	- [Recommended Directory Structure](#recommended-directory-structure)
	- [Usage](#usage)
		- [Methods](#methods)
			- [`Init(str: string)`](#initstr-string)
			- [`Ok(str: string)`](#okstr-string)
			- [`Error(str: string, err: Error)`](#errorstr-string-err-error)
			- [`Request(method: string, url: string)`](#requestmethod-string-url-string)
			- [`Finish()`](#finish)
- [Testing events Domain](#testing-events-domain)

## Overview

The `TEST` module in `s42-core` provides utilities for testing your application, including tools for mocking and assertions. It is designed to simplify the testing process by providing a robust and easy-to-use interface for creating and running tests.

## Recommended Directory Structure

We recommend creating a directory called `test` within your project. Inside this directory, create an `index.ts` file. This will serve as the entry point for your tests and help organize your testing files and scripts.

## Usage

While detailed examples are not included here, you can utilize the `TEST` module to efficiently test domain events and other parts of your application. Refer to specific documentation and examples for more comprehensive guidance on using the `TEST` module.

For more details and advanced usage, please refer to the additional documentation provided in the individual test files.


### Methods

#### `Init(str: string)`

Displays an initialization message.

- **str**: The message to display.

#### `Ok(str: string)`

Displays a success message.

- **str**: The message to display.

#### `Error(str: string, err: Error)`

Displays an error message along with the error object.

- **str**: The message to display.
- **err**: The error object to display.

#### `Request(method: string, url: string)`

Displays a message indicating an HTTP request.

- **method**: The HTTP method of the request (e.g., GET, POST).
- **url**: The URL of the request.

#### `Finish()`

Displays a message indicating that all tests have been completed.


# Testing events Domain
```typescript
import { Test, EventsDomain, RedisClient } from 's42-core'

const redisInstance = RedisClient.getInstance(process.env.REDIS_URI)
const eventsDomain = EventsDomain.getInstance(redisInstance, 'testing-algo')

async function doEmitEventCreateUsers() {
	try {
		Test.Init('init doEmitEventCreateUsers')

		eventsDomain.emitEvent('users.created', {
			firstName: 'pepe',
			lastName: 'luis',
			email: 'cesarcasas@bsdsolutions.com.ar',
			lang: 'es',
			template: 'send-coupon',
		})

		Test.Ok('Test doEmitEventCreateUsers passed')
	} catch (error) {
		Test.Error('Test doInvalidTokenRequest failed:', error as Error)
	}
}
async function runTests() {
	await doEmitEventCreateUsers()
	Test.Finish()
}

console.info('Esperando instancias en listener')
const intervalId = setInterval(() => {
	const events = Object.keys(eventsDomain.getAllRegisteredEvents())
	if (events.length > 0) {
		clearInterval(intervalId)
		runTests()
	}
}, 500)

```