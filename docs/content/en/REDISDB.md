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
- Keep payloads JSON-serializable.
- Use the native Bun client directly if one process requires independently
  configured Redis connections.
