# CoreStats

`CoreStats` exposes a framework introspection endpoint automatically.

## Purpose

- Adds `GET /core/stats` when enabled.
- Lists every exposed endpoint as `method + path`.
- Lists every loaded module as `name + version + type`.
- Includes lightweight runtime metadata.

## Enable it

Set:

```bash
ENABLE_CORE_STATS=true
```

## Usage

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

const server = new Server()
await server.start({
  port: 5678,
  RouteControllers: new RouteControllers(modules.getControllers()),
  hooks: modules.getHooks(),
})
```

If `ENABLE_CORE_STATS=true`, `RouteControllers` injects `GET /core/stats` automatically.

## Manual instantiation

```ts
new CoreStats({
  enabled?,
  path?,
  commandRunner?,
})
```

This is only needed for advanced customization or testing.

Options:
- `enabled`: overrides env detection.
- `path`: custom path instead of `/core/stats`.
- `commandRunner`: optional command executor override for testing/custom environments.

## Main API

- `isEnabled()`
- `getPath()`
- `getController()`
- `getStats()`

## Response shape

Example:

```json
{
  "ok": true,
  "feature": "core-stats",
  "path": "/core/stats",
  "enabled": true,
  "summary": {
    "totalControllers": 6,
    "totalEndpoints": 12,
    "totalModulesLoaded": 4,
    "totalModulesFull": 2,
    "totalModulesShare": 1,
    "totalModulesMws": 1
  },
  "endpoints": [
    { "method": "GET", "path": "/core/stats" },
    { "method": "GET", "path": "/operators/list" }
  ],
  "modules": [
    { "name": "auth", "version": "1.0.0", "type": "mws" },
    { "name": "operators", "version": "1.0.0", "type": "full" }
  ],
  "system": {
    "memory": {
      "totalMB": 2048,
      "usedMB": 1024,
      "availableMB": 1536
    },
    "disk": {
      "root": {
        "available": "60G"
      }
    },
    "uptime": {
      "raw": "10:00:00 up 5 days"
    },
    "connectedUsers": {
      "totalUsers": 2
    },
    "cpuFrequency": {
      "raw": "current CPU frequency: 3.20 GHz"
    }
  }
}
```

## Notes

- The route is injected only when enabled.
- You do not need to instantiate `CoreStats` for normal framework usage.
- If your app already defines `GET /core/stats`, `RouteControllers` does not inject a duplicate route.
- `CoreStats` reads controller data from `getControllersStats()` and module data from `getModulesStats()`.
- The endpoint also runs `free -m`, `df -h`, `uptime`, `who`, and `cpupower frequency-info`.
