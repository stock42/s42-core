# MODULES

## Purpose

`Modules` is the dynamic module loader in S42-Core.
It discovers `__module__.ts` files, validates module manifests with `zod`, and loads runtime capabilities by module type.

## Supported module types

1. `mws`
Middleware modules. Must provide `mws/index.ts` with:
- `default` export (constructor/init)
- `beforeRequest`
- `afterRequest` (or `exportRequest` alias)

2. `share`
Shared modules for reusable code only. No controllers/events/hooks registration.

3. `full`
Domain modules with controllers and optional events.

## Load order

1. All `mws` modules
2. All `share` modules
3. All `full` modules

This guarantees middleware availability before full controllers are loaded.

## Controller-level middleware activation

Middleware is on-demand (not global by default).
Controllers can request middleware using:

- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)

Reference modes:

- `['mws']`: all middleware modules
- `['auth']`: one specific middleware module by name

## Constructor

```ts
const modules = new Modules('./modules', eventsDomain?)
```

## Public API

- `load()`
- `setEventsDomain(eventsDomain)`
- `getControllers()`
- `getHooks()`
- `getSharedModules()`
- `getLoadedModules()`
- `getModulesStats()`
- `getServices()`
- `getModels()`
- `getTypes()`

## Example manifest

```ts
export default {
  name: 'operators',
  version: '1.0.0',
  type: 'full',
  enabled: true,
  dependencies: [{ module: 'auth', version: 1 }],
}
```

`enabled` defaults to `true`. If a module sets `enabled: false`, the loader skips it completely, including middleware, controllers, and events.

## Example controller using middleware on-demand

```ts
export default {
  name: 'operatorList',
  version: '1.0.0',
  method: 'GET',
  path: '/operators/list',
  requireBefore: ['mws'],
  handler: async (req, res, { events }) => {
    events.emit('Operator$List$Completed', { ok: true })
    return res.json({ ok: true })
  },
}
```

Controller contract loaded by `Modules`:

- `handler` must be a function.
- Signature: `handler(req, res, { events })`.
- The third argument exposes `{ events }`.
- `events.emit(eventName, payload?)` is available there.
- The emitted name is prefixed automatically with the module name at runtime.

## Notes

- `share` modules intentionally ignore `controllers/`, `events/`, and `mws/` folders.
- Disabled modules (`enabled: false`) are ignored during discovery and never enter the load pipeline.
- Event files under `events/` are auto-registered when `EventsDomain` is configured.
- Keep module contracts strict and versioned.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
