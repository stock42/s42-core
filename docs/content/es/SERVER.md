# SERVER

## Propósito

`Server` encapsula `Bun.serve` y conecta el listener HTTP con
`RouteControllers`, hooks globales e IPC de cluster.

## Constructor

```ts
const server = new Server()
```

El constructor no recibe argumentos y registra el listener IPC del worker.

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

| Opción               | Default de runtime | Comportamiento                                          |
| -------------------- | -----------------: | ------------------------------------------------------- |
| `port`               |                `0` | Puerto del listener; el contrato TypeScript lo requiere |
| `clustering`         |            `false` | Se pasa a Bun como `reusePort`                          |
| `idleTimeout`        |              `300` | Idle timeout de conexión de Bun                         |
| `maxRequestBodySize` |        `1_000_000` | Máximo de bytes del request body                        |
| `hooks`              |               `[]` | Hooks globales de rutas                                 |
| `RouteControllers`   |            ninguno | Mapa de rutas y callback fallback                       |
| `development`        |            `false` | Modo development de Bun                                 |
| `awaitForCluster`    |            `false` | Espera un comando IPC `start` del padre                 |
| `error`              | error HTML interno | Override del error handler de Bun                       |

Sin `RouteControllers`, todos los requests reciben un `404` en texto plano.

## Comportamiento en runtime

1. Construye el callback fallback con `RouteControllers.getCallback(hooks)`.
2. Construye el mapa de rutas nativas con `RouteControllers.getRoutes(hooks)`.
3. Inicia `Bun.serve` con `routes` y `fetch`.
4. Con `awaitForCluster`, espera hasta recibir `start` desde el proceso padre.

## Helpers públicos

- `getPort(): number | undefined`
- `getURL(): string | undefined`
- `isStartedFromCluster(): boolean`
- `getClusterName(): string`
- `sendMessageToCluster(message): void`
- `sendMessageToWorkers(message): void`
- `onMessageFromWorkers(callback): void`

`sendMessageToCluster()` y `sendMessageToWorkers()` solamente operan cuando
existe `process.send`. En otro contexto registran un warning.

## Ejemplo mínimo

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

## Seguridad y ciclo de vida

- El error handler default devuelve mensaje y stack como HTML. En producción,
  proveer un callback `error` sanitizado y registrar el error interno por
  separado.
- `development` se reenvía a Bun; no reemplaza una política de errores segura.
- El wrapper no expone actualmente un método público `stop()`.
- Un server worker en cluster debe usar `clustering: true` para habilitar
  `reusePort` en Bun.
