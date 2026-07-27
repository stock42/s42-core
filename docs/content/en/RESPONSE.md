# RESPONSE (`Res`)

## Purpose

`Res` is the response builder passed to controller callbacks. Every terminal
method returns a Web `Response`.

## API

- `status(code): this`
- `setHeader(key, value): void`
- `json(data): Response`
- `send(data): Response`
- `html(data): Response`
- `text(data): Response`
- `redirect(url): Response`

## Example

```ts
import { Controller } from 's42-core'

const create = new Controller('POST', '/items', async (_req, res) => {
	res.setHeader('X-Resource-Type', 'item')
	return res.status(201).json({ ok: true })
})
```

## Content types

- `json()` sets `Content-Type: application/json`.
- `html()` sets `Content-Type: text/html`.
- `text()` sets `Content-Type: text/plain`.
- `send()` preserves existing headers and does not set a content type.
- `redirect()` sets `Location`, forces status `302`, and returns an empty body.

Headers supplied by `RouteControllers` are copied into the generated response.
`setHeader()` is not chainable.

## Notes

- Return the generated `Response` from every handler or middleware that
  terminates the chain.
- `json()` accepts objects; serialize primitives explicitly when needed.
- Header values are stored as strings and later passed to the Web `Response`
  constructor.
