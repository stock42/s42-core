# SSE

## Proposito

`SSE` facilita endpoints Server-Sent Events usando streams de lectura en Bun.

## Constructor

```ts
const sse = new SSE(request)
```

## API

- `getResponse()`
- `getUUID()`
- `send({ eventName, eventPayload })`
- `close()`

## Ejemplo de controlador

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

## Notas

- Evitar trabajo bloqueante dentro del ciclo de request SSE.
- Liberar timers/recursos al `abort`.
- Preferir eventos pequenos y frecuentes sobre payloads grandes.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
