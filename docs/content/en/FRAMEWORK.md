![S42-Core](./DOCUMENTATION/assets/3.png)

# S42-Core

[Español](./README.es.md) · [Documentation](./DOCUMENTATION/ALL_EN.md) · [Website](https://s42core.com)

S42-Core `3.0.14` is a Bun-first TypeScript backend framework for HTTP APIs,
native WebSockets, module-oriented services and static assets, distributed
domain events, and common persistence workloads.

It is developed by **Cesar Casas** and **Stock42 LLC** with AI-assisted
engineering workflows.

## Requirements

- Bun `>=1.3.0`
- TypeScript/ESM projects
- Redis/Valkey, MongoDB, PostgreSQL, MySQL, SQLite, or SQS only when the
  corresponding component is used

Install the public package:

```bash
bun add s42-core
```

## What It Provides

- HTTP bootstrap over `Bun.serve` with native route maps and a fallback matcher.
- Typed, multi-route server WebSockets on the same Bun listener, with native
  pub/sub, backpressure, and compression plus framework metrics and shutdown.
- Convention-based module discovery with `Bun.Glob`.
- Four module types: `mws`, `share`, `full`, and `static`.
- Native `GET`/`HEAD` delivery for each static module's `public/` directory.
- Controller-level middleware selection.
- Distributed events through Redis or SQS adapters.
- MongoDB, Redis/Valkey, multi-engine SQL, and direct SQLite helpers.
- SSE, worker clustering, runtime statistics, dependency injection, and
  leveled logging.

## Quick Start

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

const server = new Server()
await server.start({
	port: 5678,
	RouteControllers: new RouteControllers(modules.getControllers()),
	StaticRoutes: modules.getStaticRoutes(),
	hooks: modules.getHooks(),
})

console.info(server.getURL())
```

Native WebSocket routes use a shared Bun handler while preserving typed
`ws.data` per controller:

```ts
import { Server, WebSocketController, WebSocketControllers } from 's42-core'

const echo = new WebSocketController({
	path: '/ws/echo',
	upgrade: () => ({ data: {} }),
	message: (ws, message) => ws.send(message),
})

await new Server().start({
	port: 5678,
	idleTimeout: 120,
	WebSocketControllers: new WebSocketControllers([echo]),
})
```

The repository includes a module demo entrypoint:

```bash
bun run modules/server.ts
```

In the current checkout, that demo and `bun run typecheck:modules` stop on a
known fixture issue: `modules/operators/controllers/operatorList.ts` imports the
missing `../events/emit` file. The package bootstrap above is unaffected.

## Module Model

S42-Core discovers `**/__module__.ts` files and loads enabled modules in this
order:

1. `mws`: on-demand request middleware from `mws/index.ts`.
2. `share`: reusable code and contracts; no automatic controller/event loading.
3. `full`: controllers, WebSocket controllers, and events, all optional.
4. `static`: exact native routes for every regular file below required
   `public/`, mounted at the manifest's required `path`.

Minimal manifest:

```ts
export default {
	name: 'operators',
	version: '1.0.0',
	type: 'full',
	enabled: true,
	initialize: async () => {
		// Runs after this module has loaded.
	},
}
```

Typical layout:

```text
modules/
  auth/
    __module__.ts
    mws/index.ts
  share/
    __module__.ts
    services/
    types/
  operators/
    __module__.ts
    controllers/
    websockets/
    events/
  admin-ui/
    __module__.ts
    public/
      index.html
```

`dependencies` in a manifest is metadata; the current loader does not resolve
or enforce dependency versions. See [MODULES](./DOCUMENTATION/MODULES.md) for
the complete runtime contract and
[STATIC ROUTES](./DOCUMENTATION/STATIC_ROUTES.md) for public-file routing.

## Public Package API

Only exports from [`src/index.ts`](./src/index.ts) are supported package imports.

| Area            | Public exports                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| HTTP/realtime   | `Server`, `RouteControllers`, `Controller`, `Res`, `WebSocketController`, `WebSocketControllers`, controller/static statistics |
| Modules         | `Modules`, `Module`, `Model`, `Service`, `Controllers`, `getModulesStats`, static module/route contracts                       |
| Events          | `EventsDomain`, `RedisEventsAdapter`, `SQSEventsAdapter`                                                                       |
| Data            | `MongoClient`, `RedisClient`, `SQL`, `SQLite`, `SQLError`, `isSQLError`, `Dependencies`                                        |
| Runtime         | `Cluster`, `SSE`, `CoreStats`                                                                                                  |
| Logging/testing | `logger`, `setLogLevel`, `getLogLevel`, `setLogSink`, `Test`                                                                   |

The package also exports the TypeScript types declared by the root entrypoint,
including module, event, SQL, WebSocket, logger, SSE, CoreStats, and statistics
contracts.

`MongoDBStorage`, `sendEmail` (`src/Mailgun`), and `ViewTemplates` exist in the
repository but are **internal utilities**. They are not exported by the package,
and imports such as `s42-core/dist/...` are unsupported.

## Documentation

Start with the consolidated, source-aligned guide:

- [Master documentation (English)](./DOCUMENTATION/ALL_EN.md)

Component references:

- Runtime: [SERVER](./DOCUMENTATION/SERVER.md),
  [ROUTECONTROLLERS](./DOCUMENTATION/ROUTECONTROLLERS.md),
  [CONTROLLER](./DOCUMENTATION/CONTROLLER.md),
  [RESPONSE](./DOCUMENTATION/RESPONSE.md),
  [WEBSOCKETS](./DOCUMENTATION/WEBSOCKETS.md),
  [MODULES](./DOCUMENTATION/MODULES.md),
  [STATIC ROUTES](./DOCUMENTATION/STATIC_ROUTES.md), and
  [CLUSTER](./DOCUMENTATION/CLUSTER.md)
- Events: [EVENTSDOMAIN](./DOCUMENTATION/EVENTSDOMAIN.md)
- Data: [REDISDB](./DOCUMENTATION/REDISDB.md),
  [MONGODB](./DOCUMENTATION/MONGODB.md), [SQL](./DOCUMENTATION/SQL.md), and
  [SQLITE](./DOCUMENTATION/SQLITE.md)
- Utilities: [SSE](./DOCUMENTATION/SSE.md),
  [CORESTATS](./DOCUMENTATION/CORESTATS.md),
  [DEPENDENCIES](./DOCUMENTATION/DEPENDENCIES.md),
  [LOGGER](./DOCUMENTATION/LOGGER.md), and
  [TEST](./DOCUMENTATION/TEST.md)
- Internal reference only: [MAILGUN](./DOCUMENTATION/MAILGUN.md) and
  [VIEWTEMPLATE](./DOCUMENTATION/VIEWTEMPLATE.md)

Spanish component references use the `.es.md` suffix, beginning with
[SERVER.es](./DOCUMENTATION/SERVER.es.md) and
[MODULES.es](./DOCUMENTATION/MODULES.es.md).

## Operational Notes

- `CoreStats` is disabled by default. When enabled, it exposes host and process
  information and does not add authentication; protect the route before using it
  outside a trusted network.
- `RouteControllers` currently emits permissive, fixed CORS headers. Review the
  [routing security notes](./DOCUMENTATION/ROUTECONTROLLERS.md) before production
  exposure.
- `SSE` requires the raw Web `Request`; the normalized controller request does
  not currently preserve its abort signal.
- WebSocket authentication and authorization belong in the required `upgrade`
  callback; HTTP hooks do not run for the handshake. Native pub/sub and metrics
  are process-local in a cluster.
- Everything below a static module's `public/` directory, including dotfiles,
  is public and bypasses HTTP hooks. Use a controller for protected files.
- MongoDB, Redis, and EventsDomain use process-wide singletons: the first
  configuration passed to `getInstance()` wins.

## Development

```bash
bun run typecheck
bun run typecheck:modules
bun run lint
bun test
```

All gates except `typecheck:modules` pass in the current checkout; its known
fixture failure is described above.

See [CHANGELOG.md](./CHANGELOG.md) for shipped changes and
[ROADMAP.md](./ROADMAP.md) for planned features.

## License

[MIT](./LICENSE)
