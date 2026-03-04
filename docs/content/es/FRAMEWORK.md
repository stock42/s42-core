![s42-core](./DOCUMENTATION/assets/3.png)

# S42-Core

S42-Core es un framework backend Bun-first para construir APIs, servicios y celulas modulares de forma profesional.
Se basa en carga dinamica de modulos, HTTP de alto rendimiento y comunicacion orientada a eventos.

Desarrollado por **Cesar Casas** (CEO y Jefe de Ingenieria de **Stock42 LLC**) con flujos de ingenieria asistidos por AI (Codex).

## Que resuelve S42-Core

- Backends HTTP rapidos sobre Bun (`Bun.serve`, Web `Request/Response`).
- Arquitectura modular por convencion de carpetas.
- Comunicacion desacoplada por eventos para celulas/microservicios.
- Utilidades integradas para Redis, MongoDB, SQL, SQLite, SSE y contenedor de dependencias.
- Orquestacion de cluster e IPC para entornos multi-worker.

## Arquitectura Bun-First

Las decisiones de runtime priorizan APIs nativas de Bun:

- Servidor HTTP: `Bun.serve`
- Registro de rutas: `Bun.serve({ routes })` + matcher manual para casos wildcard
- Procesos/workers: `Bun.spawn` + IPC
- Descubrimiento de archivos/modulos: `Bun.Glob`
- SQL/SQLite: `Bun.SQL` y `bun:sqlite`
- Redis: `Bun.RedisClient`

## Sistema de Modulos

S42-Core soporta tres tipos de modulo:

1. `full`
Modulos de dominio con `controllers/` y opcionalmente `events/`.
2. `mws`
Modulos middleware con contrato `mws/index.ts` (`default`, `beforeRequest`, `afterRequest`).
3. `share`
Modulos compartidos para codigo reutilizable (`services`, `types`, `utils`, etc.) sin registro de rutas/eventos.

Orden de carga:

1. `mws`
2. `share`
3. `full`

La ejecucion de middleware es bajo demanda por controlador (`requireBefore`, `requireAfter`, `beforeRequest`, `afterRequest`).

## Inicio rapido

Instalacion:

```bash
bun add s42-core
```

Bootstrap minimo:

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

const server = new Server()
await server.start({
  port: 5678,
  RouteControllers: new RouteControllers(modules.getControllers()),
  hooks: modules.getHooks(),
})
```

Demo local del repo:

```bash
bun run modules/server.ts
```

## Convencion de carpetas de modulos

```text
modules/
  auth/
    __module__.ts          # type: "mws"
    mws/index.ts
  share/
    __module__.ts          # type: "share"
    services/
    types/
  operators/
    __module__.ts          # type: "full"
    controllers/
    events/
```

## Indice de documentacion

Ingles:

- [SERVER](./DOCUMENTATION/SERVER.md)
- [ROUTECONTROLLERS](./DOCUMENTATION/ROUTECONTROLLERS.md)
- [CONTROLLER](./DOCUMENTATION/CONTROLLER.md)
- [MODULES](./DOCUMENTATION/MODULES.md)
- [CLUSTER](./DOCUMENTATION/CLUSTER.md)
- [EVENTSDOMAIN](./DOCUMENTATION/EVENTSDOMAIN.md)
- [REDISDB](./DOCUMENTATION/REDISDB.md)
- [MONGODB](./DOCUMENTATION/MONGODB.md)
- [SQL](./DOCUMENTATION/SQL.md)
- [SQLITE](./DOCUMENTATION/SQLITE.md)
- [SSE](./DOCUMENTATION/SSE.md)
- [DEPENDENCIES](./DOCUMENTATION/DEPENDENCIES.md)
- [MAILGUN](./DOCUMENTATION/MAILGUN.md)
- [VIEWTEMPLATE](./DOCUMENTATION/VIEWTEMPLATE.md)
- [TEST](./DOCUMENTATION/TEST.md)

Espanol:

- [SERVER.es](./DOCUMENTATION/SERVER.es.md)
- [ROUTECONTROLLERS.es](./DOCUMENTATION/ROUTECONTROLLERS.es.md)
- [CONTROLLER.es](./DOCUMENTATION/CONTROLLER.es.md)
- [MODULES.es](./DOCUMENTATION/MODULES.es.md)
- [CLUSTER.es](./DOCUMENTATION/CLUSTER.es.md)
- [EVENTSDOMAIN.es](./DOCUMENTATION/EVENTSDOMAIN.es.md)
- [REDISDB.es](./DOCUMENTATION/REDISDB.es.md)
- [MONGODB.es](./DOCUMENTATION/MONGODB.es.md)
- [SQL.es](./DOCUMENTATION/SQL.es.md)
- [SQLITE.es](./DOCUMENTATION/SQLITE.es.md)
- [SSE.es](./DOCUMENTATION/SSE.es.md)
- [DEPENDENCIES.es](./DOCUMENTATION/DEPENDENCIES.es.md)
- [MAILGUN.es](./DOCUMENTATION/MAILGUN.es.md)
- [VIEWTEMPLATE.es](./DOCUMENTATION/VIEWTEMPLATE.es.md)
- [TEST.es](./DOCUMENTATION/TEST.es.md)

## Prioridades actuales

Ver [TODO.md](./TODO.md) para backlog priorizado (P0-P3) basado en analisis completo de `src/` y alineacion con docs de Bun.

## Licencia

MIT

## Creditos

S42-Core es desarrollado por **Cesar Casas** y el equipo de ingenieria de **Stock42 LLC**, empresa especializada en soluciones AI, AI agents y plataformas backend de nivel profesional.
