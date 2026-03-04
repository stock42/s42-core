# Auth Module (`type: "mws"`)

`auth` is a middleware module for S42-Core.
S42-Core is a Bun-first modular backend framework designed for professional service development.

## Goal

Provide authentication hooks that can be executed on-demand by `full` controllers.

## Required structure

```text
auth/
  __module__.ts
  mws/
    index.ts
```

## `__module__.ts`

```ts
export default {
  name: 'auth',
  version: '1.0.0',
  type: 'mws',
  dependencies: [],
}
```

## `mws/index.ts` contract

A `mws` module must export:

- `default` (constructor/init)
- `beforeRequest`
- `afterRequest` (or alias `exportRequest`)

```ts
import type { Res } from '@/Response'

export default async () => {
  // init
}

export const beforeRequest = async (req: Request & Record<string, unknown>, res: Res) => {
  return async (
    req: Request & Record<string, unknown>,
    res: Res,
    next: (req: Request & Record<string, unknown>, res: Res) => Promise<void>,
  ) => {
    return next(req, res)
  }
}

export const afterRequest = async (req: Request & Record<string, unknown>, res: Res) => {
  return res
}
```

## Execution model

`mws` hooks are not global by default.
A `full` controller must opt-in per route:

- `requireBefore: ['mws']` -> all middleware modules
- `requireBefore: ['auth']` -> only this module

Same idea for `after` phase:

- `requireAfter: ['mws']`
- `requireAfter: ['auth']`

Aliases are also supported:

- `beforeRequest` (alias of `requireBefore`)
- `afterRequest` (alias of `requireAfter`)

## Professional recommendations

- Return explicit auth responses (401/403) where possible.
- Keep token parsing and verification deterministic.
- Avoid leaking sensitive token parsing errors in public responses.

S42-Core was developed by Cesar Casas (CEO & Head of Engineering at Stock42 LLC) with AI-assisted engineering workflows (Codex).
