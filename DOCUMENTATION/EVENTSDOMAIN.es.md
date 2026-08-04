# EVENTSDOMAIN

## Propósito

`EventsDomain` es el registro y dispatcher distribuido de eventos, global al
proceso, de S42-Core.

Adaptador default: `RedisEventsAdapter`.
Adaptador opcional: `SQSEventsAdapter`.

## Singleton

```ts
const events = EventsDomain.getInstance(redisClient?, processUUID?, clusterId?)
```

La primera llamada crea el singleton. Los argumentos posteriores no lo
reconfiguran. El cluster ID se resuelve desde el valor explícito,
`S42_CLUSTER_ID`, `CLUSTER_NAME` y finalmente `default`.

## Nombres de eventos

Luego de normalizar, los nombres estándar deben:

- contener al menos tres segmentos separados por puntos;
- usar `[A-Z0-9_-]` en cada segmento;
- estar en mayúsculas.

`$` se convierte en `.` y se eliminan espacios:

```text
Operator$Signup$Approved -> OPERATOR.SIGNUP.APPROVED
```

Cuando se pasa `moduleName`, se antepone salvo que ya esté presente.

## API principal

- `listen({ eventName, multiple? }, handler?, moduleName?)`
- `emit({ eventName, payload }): Promise<boolean>`
- `registerEmitter(eventName, moduleName?)`
- `setAdapter(adapter)`
- `getAllRegisteredEvents()`
- `getAllRegisteredEventsIntoCluster()`
- `close()`
- compatibilidad: `listenEvent(eventName, callback)`, `emitEvent(eventName, payload)`

Los emisores deben registrarse antes de emitir.

## Ejemplo

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

`emit()` devuelve `false` si el evento/emisor no está registrado o no existe un
listener destino. `true` significa que se seleccionaron destinos y finalizaron
las publicaciones según el adaptador; no es un acuse end-to-end.

## Modos de entrega

- `multiple: false` selecciona la primera instancia listener global.
- `multiple: true` selecciona una instancia por cluster con cursor round-robin
  por cluster.
- En la instancia local elegida, todos los handlers locales corren para un
  evento multiple; solamente el primero para un evento single.

Una vez que una entrada se vuelve multiple, registros single posteriores no la
degradan.

## Garantías de entrega

El registro provee routing y descubrimiento de procesos. Por sí solo no provee
durabilidad, acknowledgements, retries, orden, persistencia, deduplicación ni
dead-letter queue. Un evento emitido mientras el consumidor elegido no está
disponible puede perderse. Usar un outbox transaccional o un flujo de colas
diseñado explícitamente cuando la entrega sea una invariante de negocio.

El adaptador cambia qué demuestra `emit() === true`:

- con el adaptador Redis incluido, `RedisClient.publish()` es fire-and-forget;
  `emit()` puede resolver antes de que Redis acepte la publicación y los
  errores se registran en logs en vez de volver al caller;
- con el adaptador SQS incluido, el envío se espera, pero solamente demuestra
  que SQS aceptó el mensaje, no que un handler lo procesó;
- fallas de handlers locales se registran y no se propagan al emisor original.

## Adaptadores

`RedisEventsAdapter` publica y suscribe mediante `RedisClient`.

`SQSEventsAdapter` acepta:

- `queueUrl`
- `region` o un `SQSClient` inyectado
- `pollIntervalMs`
- `waitTimeSeconds`
- `visibilityTimeoutSeconds`
- `maxMessages`
- `messageGroupId` para FIFO
- `messageDeduplicationId(payload)`

La topología de colas, IAM, dead-letter policy y configuración FIFO pertenecen
al consumidor.

El polling SQS actual llama handlers suscriptos de forma sincrónica pero no
espera una promise retornada por un handler. Luego elimina el mensaje recibido
aunque no exista un handler local o un handler lance/rechace. Por eso no debe
tratarse como una capa de procesamiento/acuse at-least-once para trabajo crítico
sin un adaptador propio o controles adicionales. `unsubscribe()` elimina
handlers pero no detiene el polling; `close()` solicita detener el loop después
del receive/sleep en curso.

## Liveness y cierre

Cada cinco segundos, una instancia reanuncia listeners y emisores. Las
instancias remotas silenciosas por más de quince segundos se eliminan y
`firstListener` se reasigna cuando corresponde. La instancia local no se
elimina por su propio registro.

Llamar a `close()` durante el cierre para detener el heartbeat, anunciar la
remoción del listener y cerrar el adaptador activo.

`close()` devuelve `void` y no espera un cierre asíncrono del adaptador. La
evicción por heartbeat elimina instancias listener vencidas; las entradas de
emisores no tienen liveness por instancia y no se eliminan.

## Notas

- Los payloads deben ser serializables a JSON para los adaptadores incluidos.
- Mantener contratos estables y ownership explícito en el primer segmento.
- `setAdapter()` reemplaza el adaptador y vuelve a suscribir canales locales,
  sin cambiar la identidad del singleton.
- `setAdapter()` no desuscribe ni cierra el adaptador anterior. Limpiar
  explícitamente el adaptador previo antes de reemplazarlo cuando corresponda.
