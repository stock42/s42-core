# EVENTSDOMAIN

## Purpose

`EventsDomain` is the decoupled event bus of S42-Core.
It supports inter-module and inter-instance communication with pluggable adapters.

Default adapter: Redis (`RedisEventsAdapter`).
Optional adapter: SQS (`SQSEventsAdapter`).

## Core concepts

- Event naming convention: `A.B.C` (uppercase segments).
- Emitters must be registered for event names.
- Listeners can be single or multiple (`multiple: true`).
- Registry synchronization is distributed through a control channel.

## Constructor pattern

Use singleton:

```ts
const events = EventsDomain.getInstance(redisClient, processUUID, clusterId)
```

## Main API

- `listen({ eventName, multiple? }, handler?, moduleName?)`
- `emit({ eventName, payload })`
- `registerEmitter(eventName, moduleName?)`
- `setAdapter(adapter)`
- `getAllRegisteredEvents()`
- `getAllRegisteredEventsIntoCluster()`
- Backward compatibility:
  - `listenEvent(eventName, callback)`
  - `emitEvent(eventName, payload)`

## Example

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

## Adapters

- `RedisEventsAdapter`: publish/subscribe over Redis channels.
- `SQSEventsAdapter`: queue-based pub/sub behavior over AWS SQS.

## Notes

- Keep payloads serializable JSON objects.
- Keep event names explicit and stable.
- Use module-prefixed event domains for ownership clarity.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
