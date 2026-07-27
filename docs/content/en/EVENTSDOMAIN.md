# EVENTSDOMAIN

## Purpose

`EventsDomain` is S42-Core's process-wide distributed event registry and
dispatcher.

Default adapter: `RedisEventsAdapter`.
Optional adapter: `SQSEventsAdapter`.

## Singleton

```ts
const events = EventsDomain.getInstance(redisClient?, processUUID?, clusterId?)
```

The first call creates the singleton. Later arguments do not reconfigure it.
Cluster ID resolution uses the explicit value, `S42_CLUSTER_ID`, `CLUSTER_NAME`,
then `default`.

## Event names

After normalization, standard names must:

- contain at least three dot-separated segments;
- use `[A-Z0-9_-]` in every segment;
- be uppercase.

`$` becomes `.` and spaces are removed:

```text
Operator$Signup$Approved -> OPERATOR.SIGNUP.APPROVED
```

When `moduleName` is passed, it is prepended unless already present.

## Main API

- `listen({ eventName, multiple? }, handler?, moduleName?)`
- `emit({ eventName, payload }): Promise<boolean>`
- `registerEmitter(eventName, moduleName?)`
- `setAdapter(adapter)`
- `getAllRegisteredEvents()`
- `getAllRegisteredEventsIntoCluster()`
- `close()`
- compatibility: `listenEvent(eventName, callback)`, `emitEvent(eventName, payload)`

Emitters must be registered before emission.

## Example

```ts
import { EventsDomain, RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()

const events = EventsDomain.getInstance(redis)
events.registerEmitter('OPERATORS.OPERATOR.CREATED', 'OPERATORS')

events.listen(
	{ eventName: 'OPERATORS.OPERATOR.CREATED' },
	async event => {
		console.info(event.payload)
	},
	'NOTIFICATIONS',
)

const targeted = await events.emit({
	eventName: 'OPERATORS.OPERATOR.CREATED',
	payload: { uuid: 'op-1' },
})
```

`emit()` returns `false` when the event/emitter is not registered or no listener
target exists. `true` means targets were selected and adapter publish calls
completed according to that adapter; it is not an end-to-end acknowledgement.

## Delivery modes

- `multiple: false` selects the first registered listener instance globally.
- `multiple: true` selects one instance per cluster using a per-cluster
  round-robin cursor.
- On the selected local instance, all local handlers run for a multiple event;
  only the first runs for a single event.

Once an entry becomes multiple, later single registrations do not downgrade it.

## Adapters

`RedisEventsAdapter` publishes and subscribes through `RedisClient`.

`SQSEventsAdapter` accepts:

- `queueUrl`
- `region` or injected `SQSClient`
- `pollIntervalMs`
- `waitTimeSeconds`
- `visibilityTimeoutSeconds`
- `maxMessages`
- FIFO `messageGroupId`
- `messageDeduplicationId(payload)`

Queue topology, IAM, dead-letter policy, and FIFO configuration are owned by the
consumer.

## Liveness and shutdown

Every five seconds, an instance re-announces its listeners and emitters. Remote
instances silent for more than fifteen seconds are evicted, and
`firstListener` is reassigned when required. The local instance is not evicted
by its own registry.

Call `close()` during shutdown to stop the heartbeat, announce listener removal,
and close the active adapter.

## Notes

- Payloads must be JSON-serializable for the bundled adapters.
- Keep event contracts stable and explicitly owned by their first segment.
- Adapter replacement calls `setAdapter()` and re-subscribes local channels; it
  does not change the singleton identity.
