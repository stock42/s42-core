# TEST

## Propósito

El namespace público `Test` contiene helpers de consola con colores para scripts
de smoke manuales y diagnósticos CLI.

No es un test runner ni reemplaza `bun:test`.

## API

- `Test.Init(message)`
- `Test.Ok(message)`
- `Test.Error(message, error?)`
- `Test.Request(method, url)`
- `Test.Finish()`

## Ejemplo

```ts
import { Test } from 's42-core'

Test.Init('Starting smoke test')
Test.Request('GET', '/health')
Test.Ok('Health endpoint responded')
Test.Finish()
```

`Test.Error()` imprime el stack opcional. No pasar secretos ni valores con
credenciales a estos helpers.

## Notas

- Los helpers escriben mediante `console.info`; no usan el logger configurable
  del framework.
- Usar `bun:test` para assertions, aislamiento y quality gates automatizados.
- Imports como `s42-core/dist/Test` no están soportados por el export map.
