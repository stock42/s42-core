# Operators Example (`type: "full"`)

The repository includes `modules/operators` as a small `full` module example.

## Structure

```text
operators/
  __module__.ts
  controllers/
    operatorList.ts
```

There is no tracked `events/` directory in the current checkout.

## Current repository caveat

The checked-in controller contains `import {} from '../events/emit'`, but
`events/emit.ts` does not exist. Consequently, `bun run typecheck:modules`
currently fails with `TS2307`. The controller below shows the intended public
contract rather than copying that stale import.

## Manifest

```ts
export default {
	name: 'operators',
	version: '1.0.0',
	type: 'full', // optional; full is the default
	dependencies: [{ module: 'auth', version: 1 }],
	initialize: () => {
		console.info('operators ready')
	},
}
```

`dependencies` is metadata only. The example can load even when no auth module
exists because the loader does not resolve it.

## Controller

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'operatorList',
	version: '1.0.0',
	method: 'GET',
	path: '/operators/list',
	handler: async (_req, res, { events }) => {
		events.emit('Operator$List$Completed', { ok: true })
		return res.json({ ok: true, docs: [] })
	},
	handleError: async (_req, res, error) => {
		return res.status(500).json({ ok: false, error: String(error) })
	},
} satisfies ControllerType
```

When an `EventsDomain` is configured, the event becomes:

```text
OPERATORS.OPERATOR.LIST.COMPLETED
```

## Runtime behavior

- Every TypeScript file under `controllers/` is imported.
- The controller-level `enabled` field is not currently enforced.
- `requireBefore`/`requireAfter` opt into loaded `mws` modules.
- `initialize` runs after controllers and events have loaded.
- A missing `controllers/` or `events/` directory is allowed.
