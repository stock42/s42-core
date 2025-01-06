---
title: S42-Core Microservice Example
description: How create a new microservice using s42-core
---
# Usage Examples for s42-core

This document contains practical examples to implement the main features of `s42-core`. Each example demonstrates how to leverage a key feature of the library in common scenarios.

---

## 1. Communication Between Microservices with EventsDomain

### Description
Emit and listen to events between microservices to achieve event-based communication.

### Example
```typescript
import { EventsDomain, RedisClient } from 's42-core';

const redisInstance = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisInstance, 'service-uuid');

// Emit an event
eventsDomain.emitEvent('user.registered', {
  email: 'example@example.com',
  name: 'John Doe',
});

// Listen to an event
eventsDomain.listenEvent('user.registered', (payload) => {
  console.info('User registered:', payload);
});
```

---

## 2. Creating Controllers

### Description
Define controllers to handle HTTP requests.

### Example
```typescript
import { Controller } from 's42-core';

const userController = new Controller('POST', '/users', async (req, res) => {
  const userData = req.body;
  console.info('User data received:', userData);
  res.json({ success: true, data: userData });
});
```

---

## 3. Using RouteControllers to Organize Controllers

### Description
Centralize and manage multiple controllers efficiently.

### Example
```typescript
import { RouteControllers, Controller } from 's42-core';

const healthController = new Controller('GET', '/health', async (req, res) => {
  res.text('OK');
});

const router = new RouteControllers([userController, healthController]);

// Use the router in your server
server.start({ RouteControllers: router });
```

---

## 4. Server-Sent Events (SSE)

### Description
Easily implement real-time communication with Server-Sent Events.

### Example
```typescript
import { SSE, Controller } from 's42-core';

const sseController = new Controller('GET', '/events', async (req) => {
  const sse = new SSE(req);
  setInterval(() => {
    sse.send({ eventName: 'time', eventPayload: { time: new Date().toISOString() } });
  }, 1000);
  return sse.getResponse();
});
```

---

## 5. Managing Clusters

### Description
Manage worker processes in clusters to maximize performance.

### Example
```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({ name: 'example-cluster', maxCPU: 4, watch: true });

cluster.start('./worker.js', (error) => {
  if (error) console.error('Cluster failed:', error);
});

cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});
```

---

## 6. Connecting to Redis with RedisClient

### Description
Set up and use Redis for in-memory storage and messaging systems.

### Example
```typescript
import { RedisClient } from 's42-core';

const redis = RedisClient.getInstance('redis://localhost:6379');
await redis.hset('user:1', { name: 'John Doe', email: 'john@example.com' });
const user = await redis.hgetall('user:1');
console.info('Retrieved user:', user);
```

---

## 7. SQL Queries with SQLite

### Description
Perform CRUD operations and execute SQL queries with ease.

### Example
```typescript
import { SQLite } from 's42-core';

const db = new SQLite({ type: 'file', filename: './database.sqlite' });
db.createTable('users', { id: 'INTEGER PRIMARY KEY', name: 'TEXT', email: 'TEXT' });
db.insert('users', { id: 1, name: 'John Doe', email: 'john@example.com' });
const users = db.select('users', ['*']);
console.info('Users:', users);
```

---

If you have any questions or need help, refer to the official documentation or contact the `s42-core` support team.



By following these steps, you can create a robust and scalable system that handles user creation and email sending efficiently using s42-core.


For assistance, you can contact me via my personal Telegram channel or by email:

- Telegram:[https://t.me/stock42channel](https://t.me/stock42channel)
- Email: [info@stock42.com](mailto:info@stock42.com)
- Twitter: [https://twitter.com/stock42ok](Twitter)
