![S42-Core](./DOCUMENTATION/assets/3.png)

# S42-Core

[English](./README.md) · [Documentación](./DOCUMENTATION/ALL_EN.md) · [Sitio web](https://s42core.com)

S42-Core `3.0.10` es un framework backend TypeScript, Bun-first, para APIs HTTP,
servicios orientados a módulos, eventos de dominio distribuidos y persistencia
de uso común.

Es desarrollado por **Cesar Casas** y **Stock42 LLC** con flujos de ingeniería
asistidos por AI.

## Requisitos

- Bun `>=1.3.0`
- Proyectos TypeScript/ESM
- Redis/Valkey, MongoDB, PostgreSQL, MySQL, SQLite o SQS solamente cuando se usa
  el componente correspondiente

Instalación:

```bash
bun add s42-core
```

## Qué ofrece

- Bootstrap HTTP sobre `Bun.serve`, con mapa de rutas nativas y matcher fallback.
- Descubrimiento de módulos por convención usando `Bun.Glob`.
- Tres tipos de módulo: `mws`, `share` y `full`.
- Selección de middleware por controlador.
- Eventos distribuidos mediante adaptadores Redis o SQS.
- Helpers para MongoDB, Redis/Valkey, SQL multi-motor y SQLite directo.
- SSE, cluster de workers, estadísticas de runtime, inyección de dependencias y
  logging con niveles.

## Inicio rápido

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

console.info(server.getURL())
```

El repositorio incluye un entrypoint de demo para módulos:

```bash
bun run modules/server.ts
```

En el checkout actual, esa demo y `bun run typecheck:modules` se detienen por un
problema conocido del fixture:
`modules/operators/controllers/operatorList.ts` importa el archivo inexistente
`../events/emit`. El bootstrap del paquete mostrado arriba no está afectado.

## Modelo de módulos

S42-Core descubre archivos `**/__module__.ts` y carga los módulos habilitados en
este orden:

1. `mws`: middleware de request bajo demanda desde `mws/index.ts`.
2. `share`: código y contratos reutilizables; no carga controllers/eventos en
   forma automática.
3. `full`: controllers y eventos opcionales.

Manifest mínimo:

```ts
export default {
	name: 'operators',
	version: '1.0.0',
	type: 'full',
	enabled: true,
	initialize: async () => {
		// Se ejecuta después de cargar este módulo.
	},
}
```

Estructura típica:

```text
modules/
  auth/
    __module__.ts
    mws/index.ts
  share/
    __module__.ts
    services/
    types/
  operators/
    __module__.ts
    controllers/
    events/
```

`dependencies` dentro del manifest es metadata: el loader actual no resuelve ni
exige versiones de dependencias. Ver [MODULES.es](./DOCUMENTATION/MODULES.es.md)
para el contrato completo de runtime.

## API pública del paquete

Solamente los exports de [`src/index.ts`](./src/index.ts) son imports soportados
del paquete.

| Área          | Exports públicos                                                                        |
| ------------- | --------------------------------------------------------------------------------------- |
| HTTP          | `Server`, `RouteControllers`, `Controller`, `Res`, `getControllersStats`                |
| Módulos       | `Modules`, `Module`, `Model`, `Service`, `Controllers`, `getModulesStats`               |
| Eventos       | `EventsDomain`, `RedisEventsAdapter`, `SQSEventsAdapter`                                |
| Datos         | `MongoClient`, `RedisClient`, `SQL`, `SQLite`, `SQLError`, `isSQLError`, `Dependencies` |
| Runtime       | `Cluster`, `SSE`, `CoreStats`                                                           |
| Logging/tests | `logger`, `setLogLevel`, `getLogLevel`, `setLogSink`, `Test`                            |

El paquete también exporta desde su entrypoint los tipos TypeScript de módulos,
eventos, SQL, logger, SSE, CoreStats y estadísticas.

`MongoDBStorage`, `sendEmail` (`src/Mailgun`) y `ViewTemplates` existen dentro
del repositorio, pero son **utilidades internas**. No están exportadas por el
paquete y los imports `s42-core/dist/...` no están soportados.

## Documentación

Guía consolidada y alineada con el código:

- [Documentación maestra (inglés)](./DOCUMENTATION/ALL_EN.md)

Referencias en español:

- Runtime: [SERVER.es](./DOCUMENTATION/SERVER.es.md),
  [ROUTECONTROLLERS.es](./DOCUMENTATION/ROUTECONTROLLERS.es.md),
  [CONTROLLER.es](./DOCUMENTATION/CONTROLLER.es.md),
  [RESPONSE.es](./DOCUMENTATION/RESPONSE.es.md),
  [MODULES.es](./DOCUMENTATION/MODULES.es.md) y
  [CLUSTER.es](./DOCUMENTATION/CLUSTER.es.md)
- Eventos: [EVENTSDOMAIN.es](./DOCUMENTATION/EVENTSDOMAIN.es.md)
- Datos: [REDISDB.es](./DOCUMENTATION/REDISDB.es.md),
  [MONGODB.es](./DOCUMENTATION/MONGODB.es.md),
  [SQL.es](./DOCUMENTATION/SQL.es.md) y
  [SQLITE.es](./DOCUMENTATION/SQLITE.es.md)
- Utilidades: [SSE.es](./DOCUMENTATION/SSE.es.md),
  [CORESTATS.es](./DOCUMENTATION/CORESTATS.es.md),
  [DEPENDENCIES.es](./DOCUMENTATION/DEPENDENCIES.es.md),
  [LOGGER.es](./DOCUMENTATION/LOGGER.es.md) y
  [TEST.es](./DOCUMENTATION/TEST.es.md)
- Referencia interna: [MAILGUN.es](./DOCUMENTATION/MAILGUN.es.md) y
  [VIEWTEMPLATE.es](./DOCUMENTATION/VIEWTEMPLATE.es.md)

## Notas operativas

- `CoreStats` está deshabilitado por defecto. Al habilitarlo expone información
  del host y del proceso, sin agregar autenticación; proteger la ruta fuera de
  redes confiables.
- `RouteControllers` emite actualmente headers CORS fijos y permisivos. Revisar
  las [notas de seguridad de routing](./DOCUMENTATION/ROUTECONTROLLERS.es.md)
  antes de publicar un servicio.
- `SSE` necesita el `Request` Web crudo; el request normalizado de los
  controladores no conserva hoy su señal de aborto.
- MongoDB, Redis y EventsDomain usan singletons por proceso: la primera
  configuración enviada a `getInstance()` es la que prevalece.

## Desarrollo

```bash
bun run typecheck
bun run typecheck:modules
bun run lint
bun test
```

Todos los gates salvo `typecheck:modules` pasan en el checkout actual; su fallo
conocido de fixture está descrito arriba.

Ver [CHANGELOG.md](./CHANGELOG.md) para cambios entregados y
[ROADMAP.md](./ROADMAP.md) para funcionalidades planificadas.

## Licencia

[MIT](./LICENSE)
