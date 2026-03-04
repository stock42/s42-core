# TEST

## Proposito

`Test` exporta helpers de consola livianos para flujos manuales de prueba y diagnostico CLI.

Exports:

- `Init(message)`
- `Ok(message)`
- `Error(message, error?)`
- `Request(method, url)`
- `Finish()`

## Ejemplo

```ts
import * as Test from 's42-core/dist/Test'

Test.Init('Starting smoke test')
Test.Request('GET', '/health')
Test.Ok('Health endpoint responded')
Test.Finish()
```

## Notas

- No reemplaza `bun:test`.
- Sirve para logs legibles en scripts o checks manuales.
- Para calidad de nivel profesional, agregar suites automatizadas unitarias/integracion.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
