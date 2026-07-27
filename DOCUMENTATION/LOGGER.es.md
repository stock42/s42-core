# LOGGER

## Propósito

El `logger` público de S42-Core ofrece filtrado por nivel y un sink de salida
inyectable para diagnósticos del framework y la aplicación.

## Niveles

```text
debug < info < warn < error < silent
```

Una llamada se emite cuando su nivel alcanza el threshold configurado.
El default es `debug`.

## Configuración inicial

Al inicializar el módulo, el logger lee:

1. `S42_LOG_LEVEL`;
2. `LOG_LEVEL`;
3. default `debug`.

Los valores aceptados son `debug`, `info`, `warn`, `error` y `silent`.

```bash
S42_LOG_LEVEL=warn bun run src/server.ts
```

## API de runtime

```ts
import { getLogLevel, logger, setLogLevel, setLogSink } from 's42-core'

setLogLevel('error')
console.info(getLogLevel()) // error

logger.debug('suppressed')
logger.error('emitted')
```

- `logger.debug/info/warn/error(...args)`
- `setLogLevel(level)`
- `getLogLevel()`
- `setLogSink(sink)`
- tipos `LogLevel`, `LogSink`

## Sink personalizado

```ts
setLogSink({
	debug: (...args) => transport.debug(args),
	info: (...args) => transport.info(args),
	warn: (...args) => transport.warn(args),
	error: (...args) => transport.error(args),
})
```

El sink default reenvía al método console correspondiente, excepto `debug`, que
usa `console.log` por compatibilidad con el output previo.

## Notas

- `setLogSink()` reemplaza el sink completo; proveer los cuatro métodos.
- La API no expone hoy un helper para volver al default.
- Nunca enviar secretos, tokens o URLs con credenciales al sink default ni a
  uno personalizado.
