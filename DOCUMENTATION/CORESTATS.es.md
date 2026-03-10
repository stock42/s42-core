# CoreStats

`CoreStats` expone automaticamente un endpoint de introspeccion del framework.

## Objetivo

- Agrega `GET /core/stats` cuando esta habilitado.
- Lista todos los endpoints expuestos como `method + path`.
- Lista todos los modulos cargados como `name + version + type`.
- Incluye metadatos livianos del runtime.

## Habilitarlo

Definir:

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

Si `ENABLE_CORE_STATS=true`, `RouteControllers` inyecta `GET /core/stats` automaticamente.

## Instanciacion manual

```ts
new CoreStats({
  enabled?,
  path?,
  commandRunner?,
})
```

## API principal

- `isEnabled()`
- `getPath()`
- `getController()`
- `getStats()`

## Notas

- La ruta se inyecta solo si esta habilitada.
- No necesitas instanciar `CoreStats` para el uso normal del framework.
- Si tu app ya define `GET /core/stats`, `RouteControllers` no duplica la ruta.
- `CoreStats` usa `getControllersStats()` y `getModulesStats()` como fuente de datos.
- El endpoint ejecuta `free -m`, `df -h`, `uptime`, `who` y `cpupower frequency-info`.
