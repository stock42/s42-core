# ROUTECONTROLLERS

## Proposito

`RouteControllers` compone multiples instancias de `Controller` y expone:

- `getRoutes(hooks)` para registro nativo en Bun.
- `getCallback(hooks)` como matcher fallback para rutas dinamicas/wildcard.
- Normalizacion de request (`query`, `body`, `params`, `formData`).
- Pipeline de hooks (`before` y `after`).

## Constructor

```ts
const router = new RouteControllers(controllers)
```

- `controllers: Controller[]`

## API publica

### `getRoutes(hooks)`

Devuelve un objeto de rutas compatible con `Bun.serve({ routes })` para metodos/rutas soportados.

### `getCallback(hooks)`

Devuelve un callback estilo `fetch` usado como fallback para patrones no soportados por `routes` (por ejemplo wildcard `*`).

## Matching de hooks

Los hooks se matchean por:

- Metodo HTTP (`exacto` o `*`)
- Segmentos de path (`exacto`, params `:id`, o wildcard `*`)

Orden de ejecucion:

1. Hooks `before` matcheados
2. Callback del controlador
3. Hooks `after` matcheados

## Objeto request para controladores

Los controladores reciben un objeto interno con:

- `headers`
- `realIp`
- `query`
- `body`
- `url`
- `method`
- `params`
- `formData()`

## Ejemplo

```ts
import { Controller, RouteControllers, Server } from 's42-core'

const health = new Controller('GET', '/health', async (_req, res) => res.json({ ok: true }))
const routes = new RouteControllers([health])

const server = new Server()
await server.start({
  port: 3000,
  RouteControllers: routes,
  hooks: [
    {
      method: '*',
      path: '*',
      when: 'before',
      handle: async (req, res, next) => next(req, res),
    },
  ],
})
```

## Notas

- `OPTIONS` responde 204 con headers CORS.
- Mantener rutas wildcard en el fallback por callback.
- Errores en hooks `before` devuelven respuesta JSON estructurada.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
