# MODULES

## Purpose

`Modules` discovers `**/__module__.ts` with `Bun.Glob`, validates module
manifests with Zod, and loads behavior according to module type.

## Manifest contract

```ts
export default {
	name: 'operators',
	version: '1.0.0',
	type: 'full',
	enabled: true,
	dependencies: [{ module: 'auth', version: 1 }],
	initialize: async () => {
		console.info('operators ready')
	},
}
```

- `name: string`
- `version: string`
- `type?: 'mws' | 'share' | 'full'` (default: `full`)
- `enabled?: boolean` (default: `true`)
- `initialize?: () => unknown | Promise<unknown>`
- `dependencies?: Array<Record<string, unknown>>`

`dependencies` is metadata only. The loader does not resolve, order, or enforce
dependency versions.

The manifest is parsed with the exported Zod `Module` schema. Defaults are
applied during parsing and unknown properties are stripped from the normalized
manifest stored by the loader and statistics registry. Import failures and Zod
validation failures reject `load()`.

## Module types and load order

Enabled modules load in this order:

1. all `mws`;
2. all `share`;
3. all `full`.

Discovery order inside each group is not a dependency contract.

### `mws`

Requires `mws/index.ts` with:

- default initialization function;
- `beforeRequest`;
- `afterRequest`, or compatibility alias `exportRequest`.

Hooks may call `next(req, res)` directly. A compatibility form that returns a
second hook function is also supported. The loader auto-advances if the hook
does not call `next()`.

Middleware modules are keyed by manifest `name`; a later enabled `mws` module
with the same name replaces the earlier entry used for controller resolution.
Middleware attached to a controller receives the controller's normalized
request and `Res` object through the current compatibility casts. A returned
`Response` does not short-circuit this middleware pipeline. Thrown before,
handler, or after errors reach the controller metadata `handleError`, when it
exists.

### `share`

Registers module metadata only. It does not automatically load services, types,
models, controllers, events, or hooks. `controllers/`, `events/`, and `mws/`
directories are ignored with a warning.

### `full`

Imports all TypeScript files under `controllers/` and optionally `events/`.
Every controller file is expected to have a compatible default export.

`initialize` is awaited after the type-specific load step. For `full`, this
means after controllers and events.

## Constructor

```ts
const modules = new Modules('./modules', eventsDomain?)
```

The path is normalized relative to `process.cwd()` unless it is absolute.

## Controller metadata

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'operatorList',
	version: '1.0.0',
	method: 'GET',
	path: '/operators/list',
	requireBefore: ['auth'],
	handler: async (_req, res, { events }) => {
		events.emit('Operator$List$Completed', { ok: true })
		return res.json({ ok: true })
	},
	handleError: async (_req, res, error) => {
		return res.status(500).json({ ok: false, error: String(error) })
	},
} satisfies ControllerType
```

Supported middleware references:

- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)
- `['mws']` means every loaded middleware module
- a module name such as `['auth']` selects that middleware

Unknown names log a warning and are skipped. Duplicate references are removed.

The handler context currently exposes `events.emit()`. The module name is
prefixed before event normalization.

The `ControllerType` contract types this helper as fire-and-forget. Its runtime
implementation returns the optional `EventsDomain.emit()` promise, but module
handlers should not depend on awaiting it through this compatibility surface.
Inject and use `EventsDomain` directly when publish completion is part of the
application flow.

## Event files

When an `EventsDomain` is configured:

- `events/emit.ts` registers every non-function named export except `default`,
  `EVENTS`, and names ending in `$Multiple`; the exported value itself is not
  used;
- a default listener function in another event file is registered only when an
  `EVENTS` configuration supplies its event name;
- named listener functions fall back to their export name when no mapping
  exists;
- `EVENTS` may be a string/array for a default handler, a global object with
  `eventName` or `events`, or a map keyed by handler name;
- `multiple` can live in the handler's `EVENTS` entry; named handlers also
  support a companion `<handlerName>$Multiple` truthy export.

Every discovered event name is prefixed with the module manifest name before
`EventsDomain` normalization. Non-function exports in listener files and
function exports in `emit.ts` are ignored.

Prefer explicit `EVENTS` mappings for stable contracts.

## Instance API

- `load()`
- `setEventsDomain(eventsDomain): this`
- `getControllers()`
- `getHooks()`
- `getSharedModules()`
- `getLoadedModules()`
- `getServices()`
- `getModels()`
- `getTypes()`

`getModulesStats()` is a standalone package export, not an instance method.

## Current compatibility behavior

- Module-level `enabled: false` skips the module.
- Controller-level `enabled` metadata is not used to skip a controller.
- Imported controller metadata is not parsed with the exported `Controllers`
  schema by the loader.
- `mws` middleware is attached directly to opted-in controllers, so
  `getHooks()` is not populated by those modules.
- Models, services, and types are not auto-discovered; their getters return
  empty collections or `undefined`.
- A missing `controllers/` or `events/` directory is allowed for `full`.
- A missing or invalid `mws/index.ts` contract throws and stops `load()`.
- `setEventsDomain()` must be called before `load()` to register event files.
  Setting it afterwards does not retroactively scan skipped events.
- `load()` has no idempotency guard or rollback. Calling it again can append
  duplicate controllers and run initialization again; a failure can leave
  components loaded earlier in that invocation registered.
- Discovery, import, and initialization failures reject immediately. The
  loader does not continue with the remaining modules.

## Statistics

`getModulesStats()` returns totals by type, module names, and the normalized
loaded manifests. Its registry is process-wide.
