# TEST

## Purpose

The public `Test` namespace contains colored console helpers for manual smoke
scripts and CLI diagnostics.

It is not a test runner and does not replace `bun:test`.

## API

- `Test.Init(message)`
- `Test.Ok(message)`
- `Test.Error(message, error?)`
- `Test.Request(method, url)`
- `Test.Finish()`

## Example

```ts
import { Test } from 's42-core'

Test.Init('Starting smoke test')
Test.Request('GET', '/health')
Test.Ok('Health endpoint responded')
Test.Finish()
```

`Test.Error()` prints the optional error stack. Do not pass secrets or
credential-bearing values to these helpers.

## Notes

- The helpers write through `console.info`; they do not use the configurable
  framework logger.
- Use `bun:test` for assertions, isolation, and automated quality gates.
- Imports such as `s42-core/dist/Test` are not supported by the package export
  map.
