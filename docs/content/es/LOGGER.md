# LOGGER

## Proposito

`logger` es el logger interno con niveles del framework. Reemplaza las llamadas sueltas a
`console.*` para poder controlar la salida en produccion sin cambiar el comportamiento por
defecto.

## Niveles

`debug` < `info` < `warn` < `error` < `silent`

Un mensaje se emite cuando su nivel es `>=` al nivel actual.

## Comportamiento por defecto

El nivel por defecto es **`debug`** (todo activado), y cada metodo reenvia al metodo `console`
correspondiente con los mismos argumentos. De fabrica, la salida es identica a la anterior — sin
cambio de comportamiento.

## Configurar el nivel

Variable de entorno (se lee al iniciar):

```bash
S42_LOG_LEVEL=warn   # o: debug | info | warn | error | silent
# LOG_LEVEL tambien se acepta como fallback
```

O en tiempo de ejecucion:

```ts
import { setLogLevel, getLogLevel } from 's42-core'

setLogLevel('error') // ahora solo se emiten mensajes de nivel error
console.log(getLogLevel()) // 'error'
```

## Sink personalizado (inyectable)

Redirige la salida (p. ej. para enviar logs estructurados) reemplazando el sink:

```ts
import { setLogSink } from 's42-core'

setLogSink({
  debug: (...a) => myTransport.debug(a),
  info: (...a) => myTransport.info(a),
  warn: (...a) => myTransport.warn(a),
  error: (...a) => myTransport.error(a),
})
```

## API

- `logger.debug/info/warn/error(...args)`
- `setLogLevel(level)` / `getLogLevel()`
- `setLogSink(sink)`
- tipos: `LogLevel`, `LogSink`

## Notas

- `console.log` se mapea a `debug` para poder silenciar la salida mas ruidosa (descubrimiento de
  modulos/rutas) subiendo el nivel.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
