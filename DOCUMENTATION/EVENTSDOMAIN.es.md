# EVENTSDOMAIN

## Proposito

`EventsDomain` es el bus de eventos desacoplado de S42-Core.
Soporta comunicacion entre modulos e instancias con adaptadores enchufables.

Adaptador por defecto: Redis (`RedisEventsAdapter`).
Adaptador opcional: SQS (`SQSEventsAdapter`).

## Conceptos clave

- Convencion de nombres: `A.B.C` (segmentos en mayusculas).
- Los emisores deben estar registrados para cada evento.
- Los listeners pueden ser single o multiple (`multiple: true`).
- La sincronizacion de registro se distribuye por un canal de control.

## Patron de constructor

Usar singleton:

```ts
const events = EventsDomain.getInstance(redisClient, processUUID, clusterId)
```

## API principal

- `listen({ eventName, multiple? }, handler?, moduleName?)`
- `emit({ eventName, payload })`
- `registerEmitter(eventName, moduleName?)`
- `setAdapter(adapter)`
- `getAllRegisteredEvents()`
- `getAllRegisteredEventsIntoCluster()`
- Compatibilidad retro:
  - `listenEvent(eventName, callback)`
  - `emitEvent(eventName, payload)`

## Ejemplo

```ts
import { EventsDomain, RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()

const events = EventsDomain.getInstance(redis)
events.registerEmitter('OPERATORS.CREATED', 'OPERATORS')

events.listen({ eventName: 'OPERATORS.CREATED' }, async (event) => {
  console.info('received', event.payload)
})

await events.emit({
  eventName: 'OPERATORS.CREATED',
  payload: { uuid: 'op-1' },
})
```

## Adaptadores

- `RedisEventsAdapter`: publish/subscribe con canales Redis.
- `SQSEventsAdapter`: comportamiento pub/sub sobre colas AWS SQS.

## Liveness de instancias

Cada instancia reanuncia sus listeners/emitters cada 5s por el canal de control. Las instancias
que quedan en silencio por mas de 3 heartbeats (15s) — p. ej. tras un crash sin comando
`removeInstance` — se eliminan del registro, y se selecciona un nuevo `firstListener` para los
eventos de listener unico, de modo que no se enruten a una instancia muerta. La instancia local
nunca es eliminada por este mecanismo.

## Notas

- Mantener payloads serializables JSON.
- Mantener nombres de eventos explicitos y estables.
- Usar prefijo de modulo para claridad de ownership.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
