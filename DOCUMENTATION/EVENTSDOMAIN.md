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

## Delivery guarantees

The registry provides routing and process discovery. It does not provide
durability, acknowledgements, retries, ordering, persistence, deduplication, or
a dead-letter queue by itself. An event emitted while its selected consumer is
unavailable can be lost. Use a transactional outbox or an explicitly designed
queue workflow when event delivery is a business invariant.

Adapter behavior changes what `emit() === true` proves:

- with the bundled Redis adapter, `RedisClient.publish()` is fire-and-forget;
  `emit()` can resolve before Redis has accepted the publication, and publish
  errors are logged rather than returned to the caller;
- with the bundled SQS adapter, the send call is awaited, but this still proves
  only that SQS accepted the message, not that a handler processed it;
- local handler failures are logged and are not propagated back to the
  original emitter.

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

The current SQS polling adapter calls subscribed handlers synchronously but
does not await a promise returned by a handler. It then deletes the received
message even when no local handler exists or a handler throws/rejects. Therefore
it must not be treated as an at-least-once processing/acknowledgement layer for
critical work without an application-owned adapter or additional controls.
`unsubscribe()` removes handlers but does not stop the polling loop; `close()`
requests that the loop stop after its current receive/sleep cycle.

## Liveness and shutdown

Every five seconds, an instance re-announces its listeners and emitters. Remote
instances silent for more than fifteen seconds are evicted, and
`firstListener` is reassigned when required. The local instance is not evicted
by its own registry.

Call `close()` during shutdown to stop the heartbeat, announce listener removal,
and close the active adapter.

`close()` itself returns `void` and does not await an asynchronous adapter
close. Heartbeat eviction removes stale listener instances; emitter registry
entries do not carry per-instance liveness and are not evicted.

## Notes

- Payloads must be JSON-serializable for the bundled adapters.
- Keep event contracts stable and explicitly owned by their first segment.
- Adapter replacement calls `setAdapter()` and re-subscribes local channels; it
  does not change the singleton identity.
- `setAdapter()` does not unsubscribe or close the previous adapter. Perform
  any required old-adapter cleanup explicitly before replacement.
