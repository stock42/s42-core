# SERVER

## Purpose

`Server` wraps `Bun.serve` and connects the HTTP listener to
`RouteControllers`, global hooks, and cluster IPC.

## Constructor

```ts
const server = new Server()
```

The constructor takes no arguments and registers the worker-side IPC listener.

## `start()`

```ts
await server.start({
	port: 5678,
	clustering: false,
	idleTimeout: 300,
	maxRequestBodySize: 1_000_000,
	hooks: [],
	RouteControllers: router,
	development: false,
	awaitForCluster: false,
	error: () => new Response('Internal Server Error', { status: 500 }),
})
```

| Option               |     Runtime default | Behavior                                           |
| -------------------- | ------------------: | -------------------------------------------------- |
| `port`               |                 `0` | Listener port; the TypeScript contract requires it |
| `clustering`         |             `false` | Passed to Bun as `reusePort`                       |
| `idleTimeout`        |               `300` | Bun connection idle timeout                        |
| `maxRequestBodySize` |         `1_000_000` | Maximum request body bytes                         |
| `hooks`              |                `[]` | Global route hooks                                 |
| `RouteControllers`   |                none | Route map and fallback callback                    |
| `development`        |             `false` | Bun development mode                               |
| `awaitForCluster`    |             `false` | Wait for a parent `start` IPC command              |
| `error`              | built-in HTML error | Bun error handler override                         |

Without `RouteControllers`, every request receives a plain-text `404`.

## Runtime behavior

1. Builds the fallback callback with `RouteControllers.getCallback(hooks)`.
2. Builds the Bun native route map with `RouteControllers.getRoutes(hooks)`.
3. Starts `Bun.serve` with both `routes` and `fetch`.
4. When `awaitForCluster` is enabled, waits until the parent sends `start`.

## Public helpers

- `getPort(): number | undefined`
- `getURL(): string | undefined`
- `isStartedFromCluster(): boolean`
- `getClusterName(): string`
- `sendMessageToCluster(message): void`
- `sendMessageToWorkers(message): void`
- `onMessageFromWorkers(callback): void`

`sendMessageToCluster()` and `sendMessageToWorkers()` only operate when
`process.send` exists. Otherwise they log a warning.

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

console.info(server.getURL())
```

## Security and lifecycle notes

- The default error handler returns the error message and stack as HTML.
  Production services should provide a sanitized `error` callback and log the
  internal error separately.
- `development` is forwarded to Bun; it is not a substitute for a sanitized
  production error policy.
- There is currently no public `stop()` method on the wrapper.
- A clustered worker server must use `clustering: true` so Bun enables
  `reusePort`.
