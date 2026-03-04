# SERVER

## Purpose

`Server` is the Bun HTTP bootstrap layer of S42-Core. It wraps `Bun.serve` and integrates:

- `RouteControllers` callback routing.
- Optional `routes` map from `RouteControllers.getRoutes()`.
- Global route hooks (`before` / `after`).
- Cluster IPC message handling when running as a worker.

## Constructor

```ts
const server = new Server()
```

No constructor arguments.

## `start()`

```ts
await server.start({
  port: 5678,
  clustering: false,
  idleTimeout: 300,
  maxRequestBodySize: 1_000_000,
  hooks: [],
  RouteControllers,
  development: false,
  awaitForCluster: false,
  error: (err) => new Response('custom error', { status: 500 }),
})
```

### `TypeServerConstructor`

- `port: number`
- `clustering?: boolean`
- `idleTimeout?: number`
- `maxRequestBodySize?: number`
- `error?: (err: Error) => Response`
- `hooks?: TypeHook[]`
- `RouteControllers?: RouteControllers`
- `development?: boolean`
- `awaitForCluster?: boolean`

## Runtime behavior

1. Creates `fetch` callback from `RouteControllers.getCallback(hooks)`.
2. Creates Bun route map from `RouteControllers.getRoutes(hooks)` when available.
3. Starts `Bun.serve` with both `routes` and `fetch` fallback.
4. If `awaitForCluster` is `true`, waits until cluster sends `start` IPC command.

## Cluster-related helpers

- `getPort()`
- `getURL()`
- `isStartedFromCluster()`
- `getClusterName()`
- `sendMessageToCluster(message)`
- `sendMessageToWorkers(message)`
- `onMessageFromWorkers(callback)`

## Minimal example

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

## Notes

- Keep `hooks` focused and deterministic; hooks run for each matching request.
- Use `RouteControllers.getRoutes()` compatible paths for Bun native route typing/performance.
- Keep fallback `fetch` path for wildcard route patterns.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
