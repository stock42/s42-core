# CONTROLLER

## Purpose

`Controller` defines endpoint handlers and middleware composition per route.

It stores:

- one route `path`
- one or more HTTP methods
- a middleware chain executed in order

## Constructor

```ts
const c = new Controller(method, path, callback)
```

- `method: TYPE_HTTP_METHOD`
- `path: string`
- `callback: Middleware`

## Methods

- `setPath(path)`
- `getPath()`
- `getMethods()`
- `get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `update()`
- `use(callback)`
- `getCallback()`

## Middleware behavior

`use(callback)` prepends middleware (`LIFO` style):

- last `use()` is executed first.
- if middleware returns `Response`, chain stops.
- if middleware returns `void`, next middleware executes.

## Example

```ts
import { Controller } from 's42-core'

const usersList = new Controller('GET', '/users', async (_req, res) => {
  return res.json({ ok: true, items: [] })
})

usersList.use(async (req, res) => {
  if (!req.headers.get('authorization')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
})
```

## Notes

- Return `Response` explicitly from middleware/handler for predictable flow.
- Keep middleware focused (auth, validation, normalization).
- `update()` and `UPDATE` are currently supported in API but should be reviewed for HTTP standard consistency.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
