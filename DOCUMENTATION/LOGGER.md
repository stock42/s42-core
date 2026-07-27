# LOGGER

## Purpose

S42-Core's public `logger` provides level filtering and an injectable output
sink for framework and application diagnostics.

## Levels

```text
debug < info < warn < error < silent
```

A call is emitted when its level is at least the configured threshold.
The default is `debug`.

## Initial configuration

At module initialization, the logger reads:

1. `S42_LOG_LEVEL`;
2. `LOG_LEVEL`;
3. default `debug`.

Accepted values are `debug`, `info`, `warn`, `error`, and `silent`.

```bash
S42_LOG_LEVEL=warn bun run src/server.ts
```

## Runtime API

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
- types `LogLevel`, `LogSink`

## Custom sink

```ts
setLogSink({
	debug: (...args) => transport.debug(args),
	info: (...args) => transport.info(args),
	warn: (...args) => transport.warn(args),
	error: (...args) => transport.error(args),
})
```

The default sink forwards to the matching console method, except `debug` uses
`console.log` for compatibility with previous framework output.

## Notes

- `setLogSink()` replaces the complete sink; provide all four methods.
- The API does not currently expose a reset-to-default helper.
- Never send secrets, tokens, or credential-bearing URLs to either the default
  or a custom sink.
