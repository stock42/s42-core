# LOGGER

## Purpose

`logger` is the framework's internal leveled logger. It replaces the scattered raw `console.*`
calls so framework output can be controlled in production without changing default behavior.

## Levels

`debug` < `info` < `warn` < `error` < `silent`

A message is emitted when its level is `>=` the current level.

## Default behavior

The default level is **`debug`** (everything on), and each method forwards to the matching
`console` method with the same arguments. Out of the box, output is identical to before — no
behavior change.

## Configuring the level

Set an environment variable (checked at startup):

```bash
S42_LOG_LEVEL=warn   # or: debug | info | warn | error | silent
# LOG_LEVEL is also accepted as a fallback
```

Or change it at runtime:

```ts
import { setLogLevel, getLogLevel } from 's42-core'

setLogLevel('error') // now only error-level messages are emitted
console.log(getLogLevel()) // 'error'
```

## Custom sink (injectable)

Redirect output (e.g. to ship structured logs) by replacing the sink:

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
- types: `LogLevel`, `LogSink`

## Notes

- `console.log` is mapped to `debug` so the noisiest output (module/route discovery) can be
  silenced by raising the level.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
