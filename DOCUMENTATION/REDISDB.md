# REDISDB

- [REDISDB](#redisdb)
	- [Overview](#overview)
	- [Recommended Usage](#recommended-usage)
	- [Methods](#methods)
		- [`hset(key: string, value: object)`](#hsetkey-string-value-object)
		- [`hget(key: string, subkey: string)`](#hgetkey-string-subkey-string)
		- [`hgetall(key: string)`](#hgetallkey-string)
		- [`subscribe<T>(channelName: string, callback: (payload: T) => void)`](#subscribetchannelname-string-callback-payload-t--void)
		- [`publish(channelName: string, payload: object)`](#publishchannelname-string-payload-object)
		- [`getInstance(connectonURI: string = 'localhost')`](#getinstanceconnectonuri-string--localhost)
		- [`close()`](#close)
	- [Additional Details](#additional-details)


## Overview

The `RedisClient` class/module in `s42-core` provides an interface for interacting with Redis databases. It includes methods for performing common Redis operations such as setting and getting hash values, as well as methods for subscribing and publishing to channels.

## Recommended Usage

It is recommended to always call the `getInstance` method to get an instance of `RedisClient` instead of creating a new instance with the `new` operator. This ensures that there is a single instance managing the Redis connection, which is more efficient and reliable.

## Methods

### `hset(key: string, value: object)`

Sets a hash value in Redis.

- **key**: The key for the hash.
- **value**: The object to set as the value for the hash.

### `hget(key: string, subkey: string)`

Gets a hash value from Redis.

- **key**: The key for the hash.
- **subkey**: The subkey for the hash value to retrieve.
- **returns**: The value associated with the subkey.

### `hgetall(key: string)`

Gets all the hash values for a given key from Redis.

- **key**: The key for the hash.
- **returns**: An object containing all the hash values.

### `subscribe<T>(channelName: string, callback: (payload: T) => void)`

Subscribes to a Redis channel and listens for messages. When a message is received, the provided callback function is called with the message payload.

- **channelName**: The name of the channel to subscribe to.
- **callback**: The function to call when a message is received.

### `publish(channelName: string, payload: object)`

Publishes a message to a Redis channel.

- **channelName**: The name of the channel to publish to.
- **payload**: The message payload to publish.

### `getInstance(connectonURI: string = 'localhost')`

Returns the singleton instance of `RedisClient`. If an instance does not already exist, it creates a new one.

- **connectonURI**: The connection URI for the Redis server.

### `close()`

Closes the Redis connection. This method should be called when the application is shutting down to ensure that all resources are properly released.

## Additional Details

The `RedisClient` class in `s42-core` automatically manages a publisher and a subscriber instance for Redis. This setup allows for easy use of the subscribe and publish functionalities without additional configuration. By using the singleton pattern through the `getInstance` method, it ensures that there is only one active connection to the Redis server at any time, which helps manage resources more efficiently.

