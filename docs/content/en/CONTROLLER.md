# CONTROLLER

## Purpose

`Controller` represents one path, one or more HTTP methods, and a local
middleware chain.

This class is distinct from the `ControllerType` metadata objects loaded from a
module's `controllers/` directory.

## Constructor

```ts
const controller = new Controller(method, path, callback)
```

- `method`: `GET`, `POST`, `PUT`, `DELETE`, `UPDATE`, `PATCH`, `OPTIONS`, or `*`
- `path: string`
- `callback(req, res)`

Construction also registers the controller in the process-wide statistics
registry used by `getControllersStats()` and `CoreStats`.

## API

- `setPath(path): this`
- `getPath(): string`
- `getMethods(): TYPE_HTTP_METHOD[]`
- `get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `update()`
- `use(callback): this`
- `getCallback()`

Method helpers add another accepted method to the same path:

```ts
const users = new Controller('GET', '/users', listUsers).post()
```

`UPDATE` is a compatibility method, not a standard HTTP method, and is excluded
from the Bun native route map.

## Middleware behavior

`use(callback)` prepends a callback:

- the last `use()` call executes first;
- returning a `Response` stops the chain;
- any other return value advances to the next callback;
- thrown callback errors become a JSON `500` response;
- a chain that ends without a response returns `End without response`.

The constructor callback is added through `use()`, so later calls to `use()` run
before it.

## Example

```ts
import { Controller } from 's42-core'

const usersList = new Controller('GET', '/users', async (_req, res) => {
	return res.json({ ok: true, items: [] })
})

usersList.use(async (req, res) => {
	const headers = (req as { headers: Headers }).headers
	if (!headers.get('authorization')) {
		return res.status(401).json({ ok: false, error: 'Unauthorized' })
	}
})
```

## Module controller metadata

`Modules` imports objects with this shape:

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'users.list',
	version: '1.0.0',
	method: 'GET',
	path: '/users',
	handler: async (_req, res, { events }) => {
		events.emit('User$List$Completed', { ok: true })
		return res.json({ ok: true })
	},
} satisfies ControllerType
```

The loader wraps this metadata in a `Controller`. The optional controller-level
`enabled` field is metadata only and is not currently used to skip loading.

## Statistics

`getControllersStats()` returns:

```ts
{
	totalControllers: number
	totalEndpoints: number
	endpoints: Array<{ method: string; path: string }>
}
```

Endpoint pairs are de-duplicated and sorted by path and method.
