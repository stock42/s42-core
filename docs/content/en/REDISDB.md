# REDISDB

## Purpose

`RedisClient` is the S42-Core Redis wrapper built on `Bun.RedisClient`.
It provides cache helpers, hash helpers, counters, and pub/sub utilities.

## Singleton access

```ts
const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()
```

## Main API

- `connect()`
- `close()`
- `isConnected()`
- `hset(key, value)`
- `hget(key, subkey)`
- `hgetall(key)`
- `setCache(key, value)`
- `getCache<T>(key)`
- `counter(key)`
- `subscribe(channel, callback)`
- `unsubscribe(channel)`
- `publish(channel, payload)`

## Pub/Sub model

The implementation uses dedicated duplicated connections for pub/sub lifecycle:

- `redisSub` for subscriptions
- `redisPub` for publishing

This avoids mixing commands and subscribe mode in a single connection.

## Example

```ts
import { RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()

redis.subscribe<{ ok: boolean }>('OPS', (payload) => {
  console.info(payload.ok)
})

redis.publish('OPS', { ok: true })
```

## Notes

- `getCache` safely handles JSON parse failures and returns `null`.
- `hgetall` returns `{}` when key is not found.
- Keep payloads JSON-serializable in pub/sub.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
