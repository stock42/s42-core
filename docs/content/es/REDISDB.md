# REDISDB

## Propósito

`RedisClient` encapsula el `RedisClient` nativo de Bun con singleton por
proceso, helpers de cache/hash, contadores y conexiones dedicadas de pub/sub. Es
compatible con endpoints Redis o Valkey.

## Singleton y resolución de URI

```ts
import { RedisClient } from 's42-core'

const redis = RedisClient.getInstance('redis://localhost:6379')
await redis.connect()
```

La primera llamada crea el singleton. Las URI posteriores no lo reconfiguran.

Resolución de URI:

1. argumento explícito;
2. `REDIS_URL`;
3. `VALKEY_URL`;
4. defaults del cliente Bun.

Un host sin scheme se normaliza como `redis://host:6379`, salvo que ya incluya
puerto.

`connect()` es seguro ante llamadas concurrentes: los callers comparten la
misma promise en curso. Conecta el cliente principal y dos duplicados para
pub/sub. Una falla parcial rechaza y limpia el marcador in-flight, pero este
wrapper no revierte explícitamente conexiones abiertas antes de la falla.

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

## Serialización

- Cache y pub/sub usan JSON.
- `getCache()` devuelve `null` ante key inexistente o JSON inválido.
- `hset()` conserva strings, serializa a JSON otros valores definidos y omite
  `undefined`.
- `hgetall()` devuelve `{}` ante un hash inexistente.

Errores de `JSON.stringify()` por valores cíclicos, `BigInt` o payloads no
soportados pueden rechazar `hset()`/`setCache()`. `publish()` captura errores de
serialización, los registra y retorna sin publicar.

## Pub/sub

La implementación duplica la conexión principal:

- `redisSub` maneja suscripciones;
- `redisPub` maneja publicaciones.

`subscribe()` y `publish()` devuelven `void`. Aseguran sus conexiones en forma
asíncrona y registran fallos; el caller no puede esperar readiness o entrega
mediante estos métodos.

```ts
redis.subscribe<{ ok: boolean }>('OPS', payload => {
	console.info(payload.ok)
})

redis.publish('OPS', { ok: true })
```

## Notas

- Llamar a `connect()` en bootstrap y a `close()` durante shutdown.
- `isConnected()` ejecuta un `PING` real; no se limita a leer el flag interno.
- `close()` devuelve `void`, inicia desuscripciones sin esperarlas, cierra los
  tres clientes y registra/absorbe errores sincrónicos de cierre.
- `counter()` ejecuta `EXISTS`, un `SET 0` opcional y luego `INCR`. El incremento
  es atómico, pero la inicialización del primer uso no: dos callers concurrentes
  pueden intercalarse y un `SET 0` puede resetear el incremento del otro. Usar
  `INCR` nativo directo o un script/transacción atómica cuando la exactitud
  concurrente sea importante.
- Mantener payloads serializables a JSON.
- JSON inválido recibido por pub/sub se registra y descarta; los errores del
  callback se capturan en la misma frontera de parseo/callback y se registran.
- Usar el cliente Bun nativo si un proceso requiere conexiones Redis con
  configuraciones independientes.
