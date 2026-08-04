# CORESTATS

## Purpose

`CoreStats` reports S42-Core controller/module registries and host command
output.

## Automatic route

Set the environment before constructing `RouteControllers`:

```bash
ENABLE_CORE_STATS=true
```

Accepted enabled values are `true` and `1` (case-insensitive after trimming).
When enabled, `RouteControllers` injects `GET /core/stats` unless that exact
method/path already exists.

Normal bootstrap needs no explicit `CoreStats` instance:

```ts
const modules = new Modules('./modules')
await modules.load()

await new Server().start({
	port: 5678,
	RouteControllers: new RouteControllers(modules.getControllers()),
	hooks: modules.getHooks(),
})
```

Changing the environment after `RouteControllers` construction does not add a
route to the existing router.

## Security

`CoreStats` does not add authentication or authorization. Its response exposes:

- every registered endpoint;
- loaded module names, versions, types, and manifest data;
- memory and disk output;
- uptime;
- connected-user output from `who`;
- CPU frequency command output.

Keep the feature disabled on public services unless the route is protected by a
trusted authentication and network boundary. The framework's current global
hooks cannot short-circuit by returning a response, so do not assume a returned
hook response protects this endpoint.

## Manual instance

```ts
const stats = new CoreStats({
	enabled: true,
	path: '/internal/core/stats',
	commandRunner: async command => ({
		command,
		ok: true,
		output: '',
	}),
})
```

Options:

- `enabled?: boolean` overrides environment detection for that instance.
- `path?: string` sets that instance's normalized path.
- `commandRunner?` replaces OS command execution, primarily for tests or
  controlled environments.

A custom manual path does not reconfigure the automatic singleton route, which
remains `/core/stats`.

## API

- `isEnabled(): boolean`
- `getPath(): string`
- `getController(): Controller | null`
- `getStats(): Promise<CoreStatsPayload>`

Repository helpers used by `RouteControllers` (not root package exports):

- `isCoreStatsEnabled(): boolean` reads `ENABLE_CORE_STATS` when called;
- `getCoreStatsPath(): string` returns the automatic route `/core/stats`;
- `getCoreStatsController(): Controller | null` returns and tracks the lazy
  singleton controller only when the environment flag is enabled.

`getController()` memoizes one `Controller` per `CoreStats` instance.

## Response

```json
{
	"ok": true,
	"feature": "core-stats",
	"generatedAt": "2026-07-27T12:00:00.000Z",
	"path": "/core/stats",
	"enabled": true,
	"summary": {
		"totalControllers": 3,
		"totalEndpoints": 4,
		"totalModulesLoaded": 2,
		"totalModulesFull": 1,
		"totalModulesShare": 0,
		"totalModulesMws": 1
	},
	"endpoints": [{ "method": "GET", "path": "/core/stats" }],
	"modules": [
		{ "name": "operators", "version": "1.0.0", "type": "full", "enabled": true }
	],
	"system": {
		"memory": {
			"ok": true,
			"totalMB": 2048,
			"usedMB": 1024,
			"freeMB": 512,
			"availableMB": 1536,
			"raw": "..."
		},
		"disk": {
			"ok": true,
			"raw": "...",
			"root": {
				"filesystem": "/dev/sda1",
				"size": "100G",
				"used": "40G",
				"available": "60G",
				"usePercentage": "40%",
				"mountedOn": "/"
			}
		},
		"uptime": { "ok": true, "raw": "..." },
		"connectedUsers": {
			"ok": true,
			"totalUsers": 1,
			"users": ["admin tty1 ..."],
			"raw": "..."
		},
		"cpuFrequency": { "ok": false, "raw": "command not found" }
	}
}
```

Commands:

- `free -m`
- `df -h`
- `uptime`
- `who`
- `cpupower frequency-info`

A missing command does not fail the endpoint. Its section reports `ok: false`
with the captured error text while the top-level payload remains `ok: true`.
The five commands execute concurrently for each `getStats()` request. Failed
commands expose captured stderr/stdout or the thrown error message in `raw`;
treat the complete payload as operationally sensitive.

## Registry behavior

Controller and module statistics are process-wide. A controller is tracked when
constructed; modules are tracked when loaded. In a multi-process cluster, each
worker reports its own process state.
