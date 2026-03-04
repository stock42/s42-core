![s42-core](./DOCUMENTATION/assets/3.png)

# S42-Core

S42-Core is a Bun-first backend framework for building professional APIs, services, and modular cells.
It is built around dynamic modules, high-performance HTTP primitives, and event-driven communication.

Developed by **Cesar Casas** (CEO & Head of Engineering at **Stock42 LLC**) with AI-assisted engineering workflows (Codex).

## What S42-Core Solves

- Fast HTTP backends on Bun (`Bun.serve`, Web `Request/Response`).
- Modular architecture with convention-based loading.
- Event-driven communication for distributed cells/services.
- Built-in utilities for Redis, MongoDB, SQL, SQLite, SSE, and dependency container patterns.
- Cluster orchestration and IPC for multi-worker runtimes.

## Bun-First Architecture

Core runtime choices follow Bun APIs first:

- HTTP server: `Bun.serve`
- Route registration: `Bun.serve({ routes })` + fallback matcher for wildcard patterns
- Process/workers: `Bun.spawn` + IPC
- File/module discovery: `Bun.Glob`
- SQL/SQLite: `Bun.SQL` and `bun:sqlite`
- Redis: `Bun.RedisClient`

## Module System

S42-Core supports three module types:

1. `full`
Domain modules with `controllers/` and optional `events/`.
2. `mws`
Middleware modules with `mws/index.ts` contract (`default`, `beforeRequest`, `afterRequest`).
3. `share`
Shared modules for reusable code (`services`, `types`, `utils`, etc.) with no route/event registration.

Load order:

1. `mws`
2. `share`
3. `full`

Middleware execution is on-demand at controller level (`requireBefore`, `requireAfter`, `beforeRequest`, `afterRequest`).

## Quick Start

Install:

```bash
bun add s42-core
```

Minimal bootstrap:

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

Run local module demo in this repo:

```bash
bun run modules/server.ts
```

## Module Folder Conventions

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

## Documentation Index

English:

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

Spanish:

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

## Current Priorities

See [TODO.md](./TODO.md) for prioritized engineering backlog (P0-P3) based on full `src/` analysis and Bun docs alignment.

## License

MIT

## Credits

S42-Core is developed by **Cesar Casas** and the engineering team at **Stock42 LLC**, a company focused on AI solutions, AI agents, and production-grade backend systems.
