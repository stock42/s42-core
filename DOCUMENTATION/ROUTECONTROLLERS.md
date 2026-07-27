# ROUTECONTROLLERS

## Purpose

`RouteControllers` composes `Controller` instances, generates Bun native routes,
provides a fallback matcher, normalizes requests, and executes global hooks.

## Constructor

```ts
const router = new RouteControllers(controllers)
```

- `controllers: Controller[]`

When `ENABLE_CORE_STATS=true` or `1`, construction also injects
`GET /core/stats` unless that exact method/path already exists.

## Public API

### `getRoutes(hooks)`

Returns the object supplied to `Bun.serve({ routes })`.

Eligible methods are `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, and
`HEAD`. Paths containing `*`, method `*`, and non-standard `UPDATE` are excluded
from the native map.

### `getCallback(hooks)`

Returns the fallback `fetch` callback. It supports exact segments, `:params`,
terminal wildcards, and method `*`.

## Normalized request

Controller callbacks receive a framework object, not the raw Web `Request`:

```ts
{
	headers: Headers
	realIp: string
	query: Record<string, string>
	body: Record<string, unknown>
	url: string
	method: string
	params: Record<string, string>
	formData: () => FormData
}
```

Parsing details:

- Non-GET JSON bodies are parsed; invalid JSON becomes `{}`.
- Multipart and URL-encoded forms are parsed once and exposed by `formData()`.
- Query values preserve embedded `=`, decode percent escapes, and use the last
  value for repeated keys.
- `realIp` trusts `x-forwarded-for`, then `cf-connecting-ip`, then uses `::1`.
- The raw request and `Request.signal` are not included.

Only trust forwarded IP headers behind a controlled proxy.

## Global hooks

Hooks match method and path through exact, `:param`, or `*` segments.

Order:

1. matched `before` hooks;
2. controller callback;
3. matched `after` hooks.

Current hook semantics:

- The pipeline auto-advances when a hook does not call `next()`.
- Returning a `Response` does not short-circuit or replace the route response.
- A thrown `before` error returns JSON with status `401` when its message
  matches token/auth/unauthorized/forbidden; other errors return `500`.
- A thrown `after` error is logged and the controller response is kept.
- After hooks cannot modify the already-created response.

## Default headers and CORS

Every dispatched route receives fixed no-cache headers, a CSP, and:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
```

There is no public CORS configuration option. The wildcard/credentials
combination is unsuitable for credentialed browser requests. Enforce an
explicit origin policy at a trusted reverse proxy or another approved boundary
before exposing a production service.

A matched `OPTIONS` request returns `204`. If no `OPTIONS` or wildcard route
matches first, the fallback can still return `404`.

## Example

```ts
import { Controller, RouteControllers, Server } from 's42-core'

const health = new Controller('GET', '/health', async (_req, res) => {
	return res.json({ ok: true })
})

const server = new Server()
await server.start({
	port: 3000,
	RouteControllers: new RouteControllers([health]),
	hooks: [
		{
			method: '*',
			path: '*',
			when: 'before',
			handle: (req, res, next) => {
				console.info(req.method, new URL(req.url).pathname)
				next(req, res)
			},
		},
	],
})
```
