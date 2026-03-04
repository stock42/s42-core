# Share Module (`type: "share"`)

`share` modules are reusable containers in S42-Core.
S42-Core is a Bun-first backend framework focused on professional modular systems.

## Goal

Centralize shared assets used by multiple modules:

- services
- types
- enums
- constants
- helpers
- hooks
- models
- utilities

## Manifest contract

```ts
export default {
  name: 'share',
  version: '1.0.0',
  type: 'share',
  dependencies: [],
}
```

`type: 'share'` is required.

## Runtime behavior

In `Modules` loader:

- `share` modules are discovered and registered.
- Load order is after `mws` and before `full`.
- They do not load controllers.
- They do not load events.
- They do not register request hooks.

If `controllers/`, `events/`, or `mws/` folders exist in a `share` module, they are ignored.

## Suggested structure

```text
share/
  __module__.ts
  constants/
  enums/
  helpers/
  hooks/
  models/
  services/
  types/
  utils/
```

## Professional recommendations

- Keep `share` as framework-level reusable layer, not feature-specific logic.
- Version shared contracts (`types`, payload schemas) with discipline.
- Avoid hidden side-effects in share utilities.

S42-Core was developed by Cesar Casas (CEO & Head of Engineering at Stock42 LLC) with AI-assisted engineering workflows (Codex).
