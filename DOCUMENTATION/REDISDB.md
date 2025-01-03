# REDISDB

- [REDISDB](#redisdb)
- [RedisClient Class Documentation](#redisclient-class-documentation)
	- [Features](#features)
	- [Installation](#installation)
	- [Example Usage](#example-usage)
		- [Basic Setup](#basic-setup)
		- [Publish and Subscribe](#publish-and-subscribe)
		- [Graceful Shutdown](#graceful-shutdown)
	- [API Documentation](#api-documentation)
		- [Methods](#methods)
			- [`getInstance(connectionURI: string = 'localhost'): RedisClient`](#getinstanceconnectionuri-string--localhost-redisclient)
			- [`hset(key: string, value: Record<string, any>): Promise<void>`](#hsetkey-string-value-recordstring-any-promisevoid)
			- [`hget(key: string, subkey: string): Promise<string | null>`](#hgetkey-string-subkey-string-promisestring--null)
			- [`hgetall(key: string): Promise<Record<string, string>>`](#hgetallkey-string-promiserecordstring-string)
			- [`subscribe<T>(channelName: string, callback: (payload: T) => void): void`](#subscribetchannelname-string-callback-payload-t--void-void)
			- [`publish(channelName: string, payload: Record<string, any>): Promise<void>`](#publishchannelname-string-payload-recordstring-any-promisevoid)
			- [`unsubscribe(channelName: string): void`](#unsubscribechannelname-string-void)
			- [`close(): void`](#close-void)
	- [Error Handling](#error-handling)
		- [Retry Mechanism](#retry-mechanism)
	- [License](#license)


# RedisClient Class Documentation

The `RedisClient` class in S42-Core provides a robust and flexible way to interact with Redis. It implements a Singleton pattern and handles multiple Redis connections for general operations, publishing, and subscribing. This class ensures stability by retrying connections and offering a simple API for common Redis tasks.

---

## Features

- **Singleton Pattern:** Ensures a single instance of the Redis client throughout the application.
- **Multiple Connections:** Dedicated connections for general commands, publishing, and subscribing.
- **Retry Mechanism:** Automatically retries connections to Redis in case of failures.
- **Typed Interface:** Ensures predictable and type-safe operations.
- **Built-in Error Handling:** Provides informative error messages for troubleshooting.

---

## Installation

Install the `S42-core` package:

```bash
bun add s42-core
```

---

## Example Usage

### Basic Setup

```typescript
import { RedisClient } from 's42-core';

const connectionURI = 'redis://localhost:6379';
const redisClient = RedisClient.getInstance(connectionURI);

// Perform operations
(async () => {
  await redisClient.hset('user:1', { name: 'John Doe', age: '30' });
  const userName = await redisClient.hget('user:1', 'name');
  console.log('User Name:', userName);
})();
```

### Publish and Subscribe

```typescript
const redisClient = RedisClient.getInstance();

// Subscribe to a channel
redisClient.subscribe('notifications', (message) => {
  console.log('Received message:', message);
});

// Publish a message to the channel
redisClient.publish('notifications', { type: 'alert', content: 'This is a test message' });
```

### Graceful Shutdown

```typescript
process.on('SIGINT', () => {
  redisClient.close();
  process.exit(0);
});
```

---

## API Documentation

### Methods

#### `getInstance(connectionURI: string = 'localhost'): RedisClient`

Returns the singleton instance of `RedisClient`.

- **Parameters:**
  - `connectionURI` *(string)*: Redis connection URI. Defaults to `localhost`.
- **Returns:**
  - *(RedisClient)*: The singleton instance.

#### `hset(key: string, value: Record<string, any>): Promise<void>`

Sets a hash field in Redis.

- **Parameters:**
  - `key` *(string)*: The key of the hash.
  - `value` *(Record<string, any>)*: The data to set.

#### `hget(key: string, subkey: string): Promise<string | null>`

Gets a value from a hash field.

- **Parameters:**
  - `key` *(string)*: The key of the hash.
  - `subkey` *(string)*: The field to retrieve.
- **Returns:**
  - *(string | null)*: The value of the field or `null` if not found.

#### `hgetall(key: string): Promise<Record<string, string>>`

Gets all fields and values from a hash.

- **Parameters:**
  - `key` *(string)*: The key of the hash.
- **Returns:**
  - *(Record<string, string>)*: All fields and values.

#### `subscribe<T>(channelName: string, callback: (payload: T) => void): void`

Subscribes to a Redis channel.

- **Parameters:**
  - `channelName` *(string)*: The channel name to subscribe to.
  - `callback` *(function)*: Callback invoked with the message payload.

#### `publish(channelName: string, payload: Record<string, any>): Promise<void>`

Publishes a message to a Redis channel.

- **Parameters:**
  - `channelName` *(string)*: The channel name to publish to.
  - `payload` *(Record<string, any>)*: The message payload.

#### `unsubscribe(channelName: string): void`

Unsubscribes from a Redis channel.

- **Parameters:**
  - `channelName` *(string)*: The channel name to unsubscribe from.

#### `close(): void`

Closes all Redis connections.

---

## Error Handling

The `RedisClient` class provides robust error handling mechanisms. If a connection or operation fails, informative error messages are logged to aid debugging.

### Retry Mechanism

Each connection attempts to reconnect up to 3 times before throwing an error. This ensures better resilience in unstable network conditions.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.