# ROUTECONTROLLERS

## Purpose

`RouteControllers` composes multiple `Controller` instances and exposes:

- `getRoutes(hooks)` for Bun native route registration.
- `getCallback(hooks)` fallback matcher for dynamic/wildcard routes.
- Request normalization (`query`, `body`, `params`, `formData`).
- Hook execution pipeline (`before` and `after`).

## Constructor

```ts
const router = new RouteControllers(controllers)
```

- `controllers: Controller[]`

## Public API

### `getRoutes(hooks)`

Returns a routes object compatible with `Bun.serve({ routes })` for supported paths/methods.

### `getCallback(hooks)`

Returns a `fetch`-style callback used as fallback for patterns not supported by `routes` (for example wildcard `*`).

## Hook matching

Hooks are matched by:

- HTTP method (`exact` or `*`)
- Path segments (`exact`, params like `:id`, or wildcard `*`)

Execution order:

1. All matched `before` hooks
2. Controller callback
3. All matched `after` hooks

## Request object passed to controllers

Controller callbacks receive an internal request object with:

- `headers`
- `realIp`
- `query`
- `body`
- `url`
- `method`
- `params`
- `formData()`

## Example

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

## Notes

- `OPTIONS` is handled with 204 + CORS headers.
- Keep wildcard routes in callback fallback path.
- Hook failures in `before` return structured JSON error response.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
