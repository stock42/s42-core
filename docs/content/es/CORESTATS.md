# CoreStats

`CoreStats` agrega una ruta automatica de introspeccion para servicios S42-Core.

## Habilitar

```bash
ENABLE_CORE_STATS=true
```

## Uso

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

Si `ENABLE_CORE_STATS=true`, `/core/stats` se registra automaticamente.

## Que expone

- todos los endpoints registrados (`method` + `path`)
- todos los modulos cargados (`mws`, `share`, `full`)
- informacion del sistema usando `free -m`, `df -h`, `uptime`, `who` y `cpupower frequency-info`

## API

- `isEnabled()`
- `getPath()`
- `getController()`
- `getStats()`
