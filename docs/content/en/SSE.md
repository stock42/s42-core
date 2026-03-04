# SSE

## Purpose

`SSE` helps expose Server-Sent Events endpoints using Bun readable streams.

## Constructor

```ts
const sse = new SSE(request)
```

## API

- `getResponse()`
- `getUUID()`
- `send({ eventName, eventPayload })`
- `close()`

## Example controller

```ts
import { Controller, SSE } from 's42-core'

export default new Controller('GET', '/stream', async (req) => {
  const sse = new SSE(req)
  const timer = setInterval(() => {
    sse.send({ eventName: 'tick', eventPayload: { now: Date.now() } })
  }, 1000)

  req.signal.addEventListener('abort', () => {
    clearInterval(timer)
    sse.close()
  })

  return sse.getResponse()
})
```

## Notes

- SSE endpoints should avoid blocking work in request lifecycle.
- Always release timers/resources on `abort`.
- Keep events small and frequent rather than large payload bursts.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
