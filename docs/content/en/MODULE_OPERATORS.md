# Operators Module (`type: "full"`)

`operators` is a domain module in S42-Core (`full` type).
S42-Core is a Bun-first framework for professional backend architecture based on modular cells.

## Recommended structure

```text
operators/
  __module__.ts
  controllers/
    operatorList.ts
    operatorCreate.ts
  events/
    emit.ts
    operator.created.ts
  models/
  services/
```

## `__module__.ts`

```ts
export default {
  name: 'operators',
  version: '1.0.0',
  type: 'full', // optional, defaults to full
  dependencies: [{ module: 'auth', version: 1 }],
}
```

## Controller contract

Each controller exports a `ControllerType` object:

```ts
import type { ControllerType } from '@/Modules'

export default {
  name: 'operatorList',
  version: '1.0.0',
  method: 'GET',
  path: '/operators/list',
  enabled: true,
  requireBefore: ['auth'],
  handler: async (req, res, { events }) => {
    events.emit('Operator$List$Completed', { ok: true })
    return res.json({ ok: true })
  },
  handleError: async (req, res, err) => res.status(500).json({ ok: false, error: 'Error' }),
} as ControllerType
```

The third argument is a runtime context object. Right now it exposes `{ events }`.

## On-demand middleware

`full` controllers activate middleware explicitly per endpoint.
Supported props:

- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)

Reference modes:

- `['mws']`: all loaded `mws` modules
- `['auth']`: specific module by name

## Runtime order

1. `mws` modules initialize first
2. `share` modules register
3. `full` modules load controllers/events
4. controller-level middleware executes on-demand

## Professional recommendations

- Keep handlers lean; move business logic to services.
- Use `handleError` for stable error shape.
- Keep event contracts explicit and version-safe.

S42-Core was developed by Cesar Casas (CEO & Head of Engineering at Stock42 LLC) with AI-assisted engineering workflows (Codex).
