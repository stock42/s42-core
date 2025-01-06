---
title: S42-Core Microservice Example
description: How create a new microservice using s42-core
---
# Ejemplos de Uso para s42-core

Este archivo contiene ejemplos prácticos para implementar las funcionalidades principales de `s42-core`. Cada ejemplo demuestra cómo aprovechar una característica clave de la librería en escenarios comunes.

---

## 1. Comunicación entre Microservicios con EventsDomain

### Descripción
Emitir y escuchar eventos entre microservicios para lograr una comunicación basada en eventos.

### Ejemplo
```typescript
import { EventsDomain, RedisClient } from 's42-core';

const redisInstance = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisInstance, 'service-uuid');

// Emitir un evento
eventsDomain.emitEvent('user.registered', {
  email: 'ejemplo@ejemplo.com',
  name: 'Juan Pérez',
});

// Escuchar un evento
eventsDomain.listenEvent('user.registered', (payload) => {
  console.info('Usuario registrado:', payload);
});
```

---

## 2. Creación de Controladores

### Descripción
Definir controladores para manejar solicitudes HTTP.

### Ejemplo
```typescript
import { Controller } from 's42-core';

const userController = new Controller('POST', '/users', async (req, res) => {
  const userData = req.body;
  console.info('Datos de usuario recibidos:', userData);
  res.json({ success: true, data: userData });
});
```

---

## 3. Uso de RouteControllers para Organizar Controladores

### Descripción
Centralizar y gestionar varios controladores con facilidad.

### Ejemplo
```typescript
import { RouteControllers, Controller } from 's42-core';

const healthController = new Controller('GET', '/health', async (req, res) => {
  res.text('OK');
});

const router = new RouteControllers([userController, healthController]);

// Usar el router en tu servidor
server.start({ RouteControllers: router });
```

---

## 4. Eventos Enviados por el Servidor (SSE)

### Descripción
Implementar comunicación en tiempo real con Server-Sent Events.

### Ejemplo
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

## 5. Gestión de Clústeres

### Descripción
Gestionar procesos de trabajo en clústeres para maximizar el rendimiento.

### Ejemplo
```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({ name: 'example-cluster', maxCPU: 4, watch: true });

cluster.start('./worker.js', (error) => {
  if (error) console.error('Cluster falló:', error);
});

cluster.onWorkerMessage((message) => {
  console.info('Mensaje desde el worker:', message);
});
```

---

## 6. Conexión a Redis con RedisClient

### Descripción
Configurar y utilizar Redis para almacenamiento en memoria y sistemas de mensajería.

### Ejemplo
```typescript
import { RedisClient } from 's42-core';

const redis = RedisClient.getInstance('redis://localhost:6379');
await redis.hset('user:1', { name: 'Juan Pérez', email: 'juan@ejemplo.com' });
const user = await redis.hgetall('user:1');
console.info('Usuario recuperado:', user);
```

---

## 7. Consultas SQL con SQLite

### Descripción
Realizar operaciones CRUD y ejecutar consultas SQL con facilidad.

### Ejemplo
```typescript
import { SQLite } from 's42-core';

const db = new SQLite({ type: 'file', filename: './database.sqlite' });
db.createTable('users', { id: 'INTEGER PRIMARY KEY', name: 'TEXT', email: 'TEXT' });
db.insert('users', { id: 1, name: 'Juan Pérez', email: 'juan@ejemplo.com' });
const users = db.select('users', ['*']);
console.info('Usuarios:', users);
```

---

Si tienes alguna pregunta o necesitas ayuda, consulta la documentación oficial o contacta al equipo de soporte de `s42-core`.




By following these steps, you can create a robust and scalable system that handles user creation and email sending efficiently using s42-core.


For assistance, you can contact me via my personal Telegram channel or by email:

- Telegram:[https://t.me/stock42channel](https://t.me/stock42channel)
- Email: [info@stock42.com](mailto:info@stock42.com)
- Twitter: [https://twitter.com/stock42ok](Twitter)
