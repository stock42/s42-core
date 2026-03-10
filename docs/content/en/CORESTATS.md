# CoreStats

`CoreStats` adds an automatic introspection route for S42-Core services.

## Enable

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

If `ENABLE_CORE_STATS=true`, `/core/stats` is registered automatically.

## What it exposes

- all registered endpoints (`method` + `path`)
- all loaded modules (`mws`, `share`, `full`)
- system information from `free -m`, `df -h`, `uptime`, `who`, and `cpupower frequency-info`

## API

- `isEnabled()`
- `getPath()`
- `getController()`
- `getStats()`
