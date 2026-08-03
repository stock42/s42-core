![S42-Core](./DOCUMENTATION/assets/3.png)

# S42-Core

[Español](./README.es.md) · [Documentation](./DOCUMENTATION/ALL_EN.md) · [Website](https://s42core.com)

S42-Core `3.0.10` is a Bun-first TypeScript backend framework for HTTP APIs,
module-oriented services, distributed domain events, and common persistence
workloads.

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
- Convention-based module discovery with `Bun.Glob`.
- Three module types: `mws`, `share`, and `full`.
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
	hooks: modules.getHooks(),
})

console.info(server.getURL())
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
3. `full`: controllers and optional events.

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
    events/
```

`dependencies` in a manifest is metadata; the current loader does not resolve
or enforce dependency versions. See [MODULES](./DOCUMENTATION/MODULES.md) for
the complete runtime contract.

## Public Package API

Only exports from [`src/index.ts`](./src/index.ts) are supported package imports.

| Area            | Public exports                                                                          |
| --------------- | --------------------------------------------------------------------------------------- |
| HTTP            | `Server`, `RouteControllers`, `Controller`, `Res`, `getControllersStats`                |
| Modules         | `Modules`, `Module`, `Model`, `Service`, `Controllers`, `getModulesStats`               |
| Events          | `EventsDomain`, `RedisEventsAdapter`, `SQSEventsAdapter`                                |
| Data            | `MongoClient`, `RedisClient`, `SQL`, `SQLite`, `SQLError`, `isSQLError`, `Dependencies` |
| Runtime         | `Cluster`, `SSE`, `CoreStats`                                                           |
| Logging/testing | `logger`, `setLogLevel`, `getLogLevel`, `setLogSink`, `Test`                            |

The package also exports the TypeScript types declared by the root entrypoint,
including module, event, SQL, logger, SSE, CoreStats, and statistics contracts.

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
  [MODULES](./DOCUMENTATION/MODULES.md), and
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
