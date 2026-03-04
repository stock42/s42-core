# REDISDB

## Proposito

`RedisClient` es el wrapper Redis de S42-Core sobre `Bun.RedisClient`.
Incluye helpers de cache, hash, contadores y pub/sub.

## Acceso singleton

```ts
const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()
```

## API principal

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

## Modelo Pub/Sub

La implementacion usa conexiones duplicadas dedicadas:

- `redisSub` para suscripciones
- `redisPub` para publicaciones

Esto evita mezclar comandos generales y modo subscribe en una sola conexion.

## Ejemplo

```ts
import { RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()

redis.subscribe<{ ok: boolean }>('OPS', (payload) => {
  console.info(payload.ok)
})

redis.publish('OPS', { ok: true })
```

## Notas

- `getCache` maneja errores de parseo JSON y retorna `null`.
- `hgetall` retorna `{}` cuando la key no existe.
- Mantener payloads serializables JSON en pub/sub.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
