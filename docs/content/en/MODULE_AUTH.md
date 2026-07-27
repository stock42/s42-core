# Auth Module Template (`type: "mws"`)

This is a template for an authentication middleware module. The repository does
not currently ship a ready-to-use auth module.

## Required structure

```text
auth/
  __module__.ts
  mws/
    index.ts
```

## Manifest

```ts
export default {
	name: 'auth',
	version: '1.0.0',
	type: 'mws',
	enabled: true,
}
```

## `mws/index.ts`

Required exports:

- default initialization function;
- `beforeRequest`;
- `afterRequest`, or compatibility alias `exportRequest`.

```ts
export default async () => {
	// one-time initialization
}

export async function beforeRequest(req, res, next) {
	if (!req.headers.get('authorization')) {
		throw new Error('Token required')
	}
	next(req, res)
}

export function afterRequest(req, res, next) {
	next(req, res)
}
```

The request here is the normalized `RouteControllers` object. The middleware
pipeline auto-advances when `next()` is omitted.

## Controller opt-in

```ts
requireBefore: ['auth']
requireAfter: ['auth']
```

`['mws']` selects every loaded middleware module. `beforeRequest` and
`afterRequest` are aliases for the corresponding `require*` metadata fields.

## Current error/response behavior

Returning a `Response` from an `mws` handler does not short-circuit the
controller. Throw to signal failure; the controller's `handleError`, when
present, decides the HTTP response. Without it, the `Controller` wrapper returns
a generic `500` path.

Map authentication failures to `401`/`403` explicitly in `handleError`, and do
not expose token parsing or verification details.
