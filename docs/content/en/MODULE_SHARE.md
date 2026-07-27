# Share Module (`type: "share"`)

A `share` module records reusable-module metadata without automatic runtime
imports.

## Manifest

```ts
export default {
	name: 'share',
	version: '1.0.0',
	type: 'share',
	enabled: true,
}
```

## Suggested structure

```text
share/
  __module__.ts
  constants/
  helpers/
  services/
  types/
  utils/
```

## Runtime behavior

- Loads after `mws` and before `full`.
- Registers the normalized manifest in module statistics.
- Runs optional `initialize`.
- Does not import services, types, models, or other folders automatically.
- Ignores `controllers/`, `events/`, and `mws/` with a warning.

Consumers use normal project imports to access shared code.

`dependencies` remains metadata; the loader does not enforce it.

## Guidance

- Keep shared contracts versioned and side-effect free.
- Keep domain-specific business behavior in a `full` module.
- Use `initialize` only for an intentional one-time side effect.
