# REDISDB

## Purpose

`RedisClient` wraps Bun's native `RedisClient` with a process-wide singleton,
cache/hash helpers, counters, and dedicated pub/sub connections. It can be used
with Redis or Valkey-compatible endpoints.

## Singleton and URI resolution

```ts
import { RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()
```

The first call creates the singleton. Later URIs do not reconfigure it.

URI resolution:

1. explicit argument;
2. `REDIS_URL`;
3. `VALKEY_URL`;
4. Bun client defaults.

A host without a scheme is normalized to `redis://host:6379`, unless a port is
already present.

`connect()` is safe to call concurrently: callers share the same in-flight
promise. It connects the main client and two duplicates for pub/sub. A partial
failure rejects and clears the in-flight marker, but connections opened before
that failure are not explicitly rolled back by this wrapper.

## API

- `connect()`
- `close()`
- `isConnected()`
- `hset(key, value)`
- `hget(key, field)`
- `hgetall(key)`
- `setCache(key, value)`
- `getCache<T>(key)`
- `counter(key)`
- `subscribe(channel, callback)`
- `unsubscribe(channel)`
- `publish(channel, payload)`

## Serialization

- Cache and pub/sub payloads use JSON.
- `getCache()` returns `null` for a missing key or invalid cached JSON.
- `hset()` preserves string values, JSON-serializes other defined values, and
  skips `undefined`.
- `hgetall()` returns `{}` for a missing hash.

`JSON.stringify()` errors from cyclic values, `BigInt`, or unsupported payloads
can reject `hset()`/`setCache()`. `publish()` catches serialization errors,
logs them, and returns without publishing.

## Pub/sub

The implementation duplicates the main connection:

- `redisSub` handles subscriptions;
- `redisPub` handles publications.

`subscribe()` and `publish()` return `void`. They ensure their connections
asynchronously and log failures; callers cannot await subscription readiness or
delivery through these methods.

```ts
redis.subscribe<{ ok: boolean }>('OPS', payload => {
	console.info(payload.ok)
})

redis.publish('OPS', { ok: true })
```

## Notes

- Call `connect()` during bootstrap and `close()` during shutdown.
- `isConnected()` performs a real `PING`; it does not merely read the internal
  connection flag.
- `close()` returns `void`, starts unsubscribe operations without awaiting
  them, closes all three clients, and logs/swallows synchronous close errors.
- `counter()` performs `EXISTS`, optional `SET 0`, then `INCR`. The increment is
  atomic, but first-use initialization is not: two concurrent callers can
  interleave and one `SET 0` can reset the other's increment. Use a direct
  native `INCR` or an atomic script/transaction when exact concurrent counters
  matter.
- Keep payloads JSON-serializable.
- Invalid JSON received from pub/sub is logged and dropped; callback errors are
  caught by the same parsing/callback boundary and logged.
- Use the native Bun client directly if one process requires independently
  configured Redis connections.
