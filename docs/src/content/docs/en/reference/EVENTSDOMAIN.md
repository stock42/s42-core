---
title: S42-Core EventsDomain Class
description: Using Events Domain from s42-core
---
- [EventsDomain - s42-core](#eventsdomain---s42-core)
	- [Purpose](#purpose)
	- [Installation](#installation)
	- [Features](#features)
	- [Usage](#usage)
		- [Setting Up EventsDomain](#setting-up-eventsdomain)
		- [Registering an Event Listener](#registering-an-event-listener)
		- [Emitting Events](#emitting-events)
		- [Closing EventsDomain](#closing-eventsdomain)
	- [Full Example](#full-example)
		- [Scenario: User Registration and Email Service](#scenario-user-registration-and-email-service)
			- [User Registration Service](#user-registration-service)
			- [Email Service](#email-service)
	- [Methods](#methods)
		- [`getInstance(redisInstance: RedisClient, uuid: string): EventsDomain`](#getinstanceredisinstance-redisclient-uuid-string-eventsdomain)
		- [`listenEvent<TypePayload>(eventName: string, callback: (payload: TypePayload) => void): void`](#listeneventtypepayloadeventname-string-callback-payload-typepayload--void-void)
		- [`emitEvent(eventName: string, payload: object): boolean`](#emiteventeventname-string-payload-object-boolean)
		- [`getAllRegisteredEvents(): Record<string, TypeEvent>`](#getallregisteredevents-recordstring-typeevent)
		- [`close(): void`](#close-void)
	- [Advantages](#advantages)
	- [License](#license)


# EventsDomain - s42-core

The `EventsDomain` class is a core utility of the `s42-core` package, designed to facilitate event-driven communication between microservices or cells in a distributed system. It enables seamless publishing, listening, and routing of events via Redis, ensuring efficient and decoupled interactions between independent services.

---

## Purpose

The `EventsDomain` class is particularly useful in scenarios where microservices or cells need to interact indirectly through events. For example:

- **User Registration and Email Sending**: A user registration service emits an event when a new user is created. The email service listens to this event to send a welcome email.
- **Order Processing and Notification**: An order processing service emits events that trigger notifications to customers via a separate notification service.
- **Real-Time Updates**: Events can be used to update UI clients or trigger specific actions in other services.

---

## Installation

Install the `s42-core` package:

```bash
npm install s42-core
```

---

## Features

1. **Event Broadcasting**: Publish events that can be consumed by other services.
2. **Listener Registration**: Easily register listeners for specific events.
3. **Dynamic Event Routing**: Supports routing of events to specific instances.
4. **Redis Integration**: Uses Redis for reliable and efficient communication.
5. **Singleton Instance**: Ensures a single instance of `EventsDomain` across the application.

---

## Usage

### Setting Up EventsDomain

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

// Initialize Redis client
const redisClient = RedisClient.getInstance('redis://localhost:6379');

// Unique identifier for the process
const processUUID = 'unique-process-id';

// Create an EventsDomain instance
const eventsDomain = EventsDomain.getInstance(redisClient, processUUID);
```

---

### Registering an Event Listener

You can listen to specific events and trigger a callback when the event occurs:

```typescript
eventsDomain.listenEvent<{ userId: string }>('user_registered', (payload) => {
  console.info('New user registered:', payload.userId);
});
```

---

### Emitting Events

To emit an event for other services to consume:

```typescript
const success = eventsDomain.emitEvent('user_registered', { userId: '12345' });
if (success) {
  console.info('Event emitted successfully.');
} else {
  console.error('Failed to emit event. Event may not be registered.');
}
```

---

### Closing EventsDomain

When shutting down the service, clean up resources:

```typescript
eventsDomain.close();
console.info('EventsDomain closed.');
```

---

## Full Example

### Scenario: User Registration and Email Service

#### User Registration Service

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

const redisClient = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisClient, 'user-service');

function registerUser(userId: string) {
  console.info('Registering user:', userId);
  // Perform user registration logic...

  // Emit event after registration
  eventsDomain.emitEvent('user_registered', { userId });
}
```

#### Email Service

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

const redisClient = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisClient, 'email-service');

eventsDomain.listenEvent<{ userId: string }>('user_registered', (payload) => {
  console.info('Sending welcome email to user:', payload.userId);
  // Perform email sending logic...
});
```

---

## Methods

### `getInstance(redisInstance: RedisClient, uuid: string): EventsDomain`

Returns a singleton instance of `EventsDomain`.

- **`redisInstance`** *(RedisClient)*: The Redis client instance for communication.
- **`uuid`** *(string)*: A unique identifier for the process.

### `listenEvent<TypePayload>(eventName: string, callback: (payload: TypePayload) => void): void`

Registers a listener for a specific event.

- **`eventName`** *(string)*: The name of the event to listen for.
- **`callback`** *(function)*: The function to execute when the event is received.

### `emitEvent(eventName: string, payload: object): boolean`

Emits an event to be consumed by other services.

- **`eventName`** *(string)*: The name of the event to emit.
- **`payload`** *(object)*: The data to send with the event.

### `getAllRegisteredEvents(): Record<string, TypeEvent>`

Returns all registered events.

### `close(): void`

Stops broadcasting events and cleans up Redis connections.

---

## Advantages

- **Decoupling**: Services can communicate without direct dependencies.
- **Scalability**: Easily handle multiple instances and distribute events efficiently.
- **Reliability**: Uses Redis for robust messaging between services.
- **Simplicity**: Provides a straightforward API for managing events.

---

## License

This project is licensed under the MIT License. See the LICENSE file for more details.