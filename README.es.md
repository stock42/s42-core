![s42-core](./DOCUMENTATION/assets/3.png)


- [Visión General](#visión-general)
- [Principales Características](#principales-características)
	- [Microservicios y Células](#microservicios-y-células)
	- [Alto Rendimiento](#alto-rendimiento)
	- [Comunicación en Tiempo Real](#comunicación-en-tiempo-real)
	- [Gestión de Clústeres](#gestión-de-clústeres)
	- [Soporte Integrado para Redis y MongoDB](#soporte-integrado-para-redis-y-mongodb)
- [Documentación](#documentación)
- [Instalación](#instalación)
- [Ejemplos de Uso](#ejemplos-de-uso)
	- [Uso de EventsDomain para Comunicación entre Microservicios](#uso-de-eventsdomain-para-comunicación-entre-microservicios)
	- [Creación de Controladores](#creación-de-controladores)
	- [Integración de Controladores con RouteControllers](#integración-de-controladores-con-routecontrollers)
	- [Eventos Enviados por el Servidor (SSE)](#eventos-enviados-por-el-servidor-sse)
	- [Gestión de Clústeres](#gestión-de-clústeres-1)
	- [API de Gestión de Productos (ABM)](#api-de-gestión-de-productos-abm)
- [Licencia](#licencia)

**Autor**: César Casas
**LinkedIn**: [César Casas](https://www.linkedin.com/in/cesarcasas/)
**Sitio Web**: [s42core.com](https://s42core.com)

## Visión General

`s42-core` es una biblioteca poderosa y flexible construida sobre Bun.js, diseñada para simplificar el desarrollo de aplicaciones, especialmente aquellas que utilizan arquitecturas de microservicios y basadas en células. Esta biblioteca admite la creación de componentes de software modulares y reutilizables, y agiliza la implementación de monorepos de alto rendimiento.

## Principales Características

### Microservicios y Células

`s42-core` permite la creación de aplicaciones escalables y modulares con microservicios o células independientes. Esta arquitectura garantiza la mantenibilidad y simplifica las actualizaciones.

### Alto Rendimiento

Las aplicaciones construidas con `s42-core` se benefician de un rendimiento excepcional, aprovechando la velocidad de Bun.js y patrones de diseño eficientes.

### Comunicación en Tiempo Real

Admite Server-Sent Events (SSE) para actualizaciones en tiempo real, ideal para notificaciones, transmisiones de datos en vivo y aplicaciones colaborativas.

### Gestión de Clústeres

Facilita la gestión de procesos de trabajo, permitiendo una utilización eficiente de sistemas multicore, con soporte para desarrollo en modo “watch”.

### Soporte Integrado para Redis y MongoDB

Ofrece utilidades para gestionar conexiones y operaciones en Redis y MongoDB, agilizando la gestión de datos en aplicaciones modernas.

### Abstracción de Base de Datos SQL

Interfaz unificada para interactuar con bases de datos PostgreSQL, MySQL y SQLite, permitiendo código agnóstico a la base de datos con gestión de esquemas y construcción de consultas.

## Documentación

Documentación detallada de cada clase y módulo:

- [CLUSTER.md](./DOCUMENTATION/CLUSTER.md)
- [CONTROLLER.md](./DOCUMENTATION/CONTROLLER.md)
- [DEPENDENCIES.md](./DOCUMENTATION/DEPENDENCIES.md)
- [EVENTSDOMAIN.md](./DOCUMENTATION/EVENTSDOMAIN.md)
- [JSONPARSE.md](./DOCUMENTATION/JSONPARSE.md)
- [MONGODB.md](./DOCUMENTATION/MONGODB.md)
- [REDISDB.md](./DOCUMENTATION/REDISDB.md)
- [ROUTECONTROLLERS.md](./DOCUMENTATION/ROUTECONTROLLERS.md)
- [SQL.md](./DOCUMENTATION/SQL.es.md)
- [SSE.md](./DOCUMENTATION/SSE.md)
- [TEST.md](./DOCUMENTATION/TEST.md)

---

## Instalación

Instala `s42-core` utilizando tu gestor de paquetes preferido:

```bash
npm install s42-core
```

---

## Ejemplos de Uso

### Uso de EventsDomain para Comunicación entre Microservicios

La clase `EventsDomain` permite una comunicación basada en eventos entre microservicios. Por ejemplo, puedes emitir un evento desde un servicio de registro de usuarios y escucharlo en un servicio de notificación por correo electrónico.

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

### Creación de Controladores

Los controladores manejan solicitudes HTTP y middleware. Aquí tienes un ejemplo de cómo crear un controlador simple:

```typescript
import { Controller } from 's42-core';

const userController = new Controller('POST', '/users', async (req, res) => {
  const userData = req.body;
  console.info('Datos de usuario recibidos:', userData);
  res.json({ success: true, data: userData });
});
```

---

### Integración de Controladores con RouteControllers

RouteControllers organiza y gestiona múltiples controladores de manera eficiente:

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

### Eventos Enviados por el Servidor (SSE)

Implementa fácilmente la comunicación en tiempo real con la clase SSE:

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

### Gestión de Clústeres

La clase `Cluster` simplifica la gestión de procesos de trabajo:

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

### API de Gestión de Productos (ABM)

Proporcionamos un ejemplo completo de una API de Gestión de Productos (ABM) que demuestra cómo construir un servicio RESTful con `s42-core`.

**Archivo:** [`example/products/index.ts`](./example/products/index.ts)

**Características:**
- **Integración de Base de Datos**: Utiliza la clase `SQL` para la conexión a PostgreSQL y gestión de esquemas.
- **Operaciones CRUD**: Implementa endpoints para Crear, Leer, Actualizar y Eliminar.
- **Paginación**: Demuestra la recuperación eficiente de datos con `selectPaginate`.
- **Organización de Controladores**: Muestra cómo estructurar controladores y rutas.

Para ejecutar este ejemplo, asegúrate de tener una base de datos PostgreSQL en ejecución y configurada.

---

## Licencia

`s42-core` está bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.

---

Desarrollado por César Casas - [LinkedIn](https://www.linkedin.com/in/cesarcasas/).

