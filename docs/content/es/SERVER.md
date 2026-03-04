# SERVER

## Proposito

`Server` es la capa de arranque HTTP de S42-Core sobre Bun. Encapsula `Bun.serve` e integra:

- Enrutado via callback de `RouteControllers`.
- Mapa opcional de `routes` desde `RouteControllers.getRoutes()`.
- Hooks globales de ruta (`before` / `after`).
- Manejo de mensajes IPC cuando corre dentro de cluster.

## Constructor

```ts
const server = new Server()
```

No recibe argumentos.

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

## Comportamiento en runtime

1. Genera callback `fetch` con `RouteControllers.getCallback(hooks)`.
2. Genera mapa de rutas Bun con `RouteControllers.getRoutes(hooks)` cuando aplica.
3. Inicia `Bun.serve` con `routes` y fallback `fetch`.
4. Si `awaitForCluster` es `true`, espera el comando IPC `start`.

## Helpers de cluster

- `getPort()`
- `getURL()`
- `isStartedFromCluster()`
- `getClusterName()`
- `sendMessageToCluster(message)`
- `sendMessageToWorkers(message)`
- `onMessageFromWorkers(callback)`

## Ejemplo minimo

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

## Notas

- Mantener hooks acotados y deterministas; se ejecutan en cada request que matchee.
- Usar rutas compatibles con `getRoutes()` para aprovechar tipado/performance nativa de Bun.
- Mantener fallback `fetch` para patrones wildcard.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
