# MODULES

## Propósito

`Modules` descubre `**/__module__.ts` con `Bun.Glob`, valida manifests mediante
Zod y carga comportamiento o archivos públicos según el tipo de módulo.

## Contrato del manifest

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
- `type?: 'mws' | 'share' | 'full'` (default: `full`), o `type: 'static'`
- `path: string` es obligatorio sólo para `static` y se rechaza en los demás tipos
- `enabled?: boolean` (default: `true`)
- `initialize?: () => unknown | Promise<unknown>`
- `dependencies?: Array<Record<string, unknown>>`

`dependencies` es solamente metadata. El loader no resuelve, ordena ni exige
versiones de dependencias.

El manifest se parsea con el schema Zod `Module` exportado. Durante el parseo se
aplican defaults y las propiedades desconocidas se eliminan del manifest
normalizado guardado por el loader y el registro de estadísticas. Fallas de
import o validación Zod rechazan `load()`.

## Tipos y orden de carga

Los módulos habilitados cargan en este orden:

1. todos los `mws`;
2. todos los `share`;
3. todos los `full`;
4. todos los `static`.

El orden de descubrimiento dentro de cada grupo no es un contrato de
dependencias.

### `mws`

Requiere `mws/index.ts` con:

- función default de inicialización;
- `beforeRequest`;
- `afterRequest`, o el alias de compatibilidad `exportRequest`.

Los hooks pueden llamar directamente a `next(req, res)`. También se acepta por
compatibilidad una forma que devuelve una segunda función hook. El loader avanza
automáticamente si el hook no llama a `next()`.

Los módulos middleware se indexan por el `name` del manifest; un módulo `mws`
habilitado posterior con el mismo nombre reemplaza la entrada anterior usada
para resolver controllers. El middleware adjunto a un controller recibe el
request normalizado y el objeto `Res` mediante los casts de compatibilidad
actuales. Retornar un `Response` no corta este pipeline. Errores lanzados en
before, handler o after llegan al `handleError` de la metadata del controller,
si existe.

### `share`

Registra solamente metadata del módulo. No carga automáticamente services,
types, models, controllers, eventos, WebSockets ni hooks. Los directorios
`controllers/`, `events/`, `mws/` y `websockets/` se ignoran con un warning.

### `full`

Importa todos los archivos TypeScript bajo `controllers/`, opcionalmente
`websockets/` y opcionalmente `events/`. Cada archivo de controlador debe tener
un default export compatible.

`initialize` se espera después de la carga propia del tipo. Para `full`, el
orden es controllers, controllers WebSocket, eventos e inicialización.

### `static`

Requiere un `path` canónico y un directorio `public/` real. Cada archivo regular
dentro de `public/`, incluidos los dotfiles, se registra como ruta nativa exacta
de Bun para `GET`/`HEAD`. `index.html` también crea un alias de directorio y un
redirect `308` desde el pathname sin barra, preservando la query.

```ts
import type { StaticModuleDefinition } from 's42-core'

export default {
	name: 'admin-ui',
	version: '1.0.0',
	type: 'static',
	path: '/admin',
	enabled: true,
} satisfies StaticModuleDefinition
```

El loader rechaza directorios públicos ausentes, symlinks, entradas no
soportadas del filesystem, paths de montaje inválidos y URLs estáticas
duplicadas. Un `public/` vacío es válido con un warning. `controllers/`,
`events/`, `mws/` y `websockets/` se ignoran con un warning. La inicialización
se ejecuta después de completar el inventario de archivos.

Obtener el registro con `getStaticRoutes()` y pasarlo a
`Server.start({ StaticRoutes })`. Ver [RUTAS ESTÁTICAS](./STATIC_ROUTES.es.md)
para mapeo de URLs, cache, rangos, precedencia, recarga y fronteras de
seguridad.

## Constructor

```ts
const modules = new Modules('./modules', eventsDomain?)
```

El constructor recibe una ruta del sistema de archivos, resuelta respecto de
`process.cwd()` al cargar, salvo que sea absoluta. La normalización, la unión
de directorios y los nombres de archivos de eventos usan la implementación de
`node:path` de Bun para la plataforma actual. En Windows se reconocen las
unidades y los separadores `\`; en Linux y macOS se mantiene el comportamiento
habitual de las rutas POSIX.

```ts
const portable = new Modules('./modules')
const windows = new Modules(String.raw`C:\projects\my-api\modules`) // En Windows
```

Todos los imports dinámicos usan `Bun.pathToFileURL()` para codificar
correctamente espacios, Unicode, `#` y `%` en los nombres. Esto cubre
manifiestos, middleware, controladores, definiciones WebSocket y eventos,
incluidos los archivos anidados `events/**/emit.ts`. Pasar una ruta del sistema
de archivos, no una URL `file://`.

## Metadata de controlador

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

Referencias de middleware soportadas:

- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)
- `['mws']` significa todos los módulos middleware cargados
- un nombre como `['auth']` selecciona ese middleware

Los nombres desconocidos registran un warning y se omiten. Las referencias
duplicadas se eliminan.

El contexto del handler expone hoy `events.emit()`. El nombre del módulo se
antepone antes de normalizar el evento.

El contrato `ControllerType` tipa este helper como fire-and-forget. La
implementación de runtime retorna la promise opcional de `EventsDomain.emit()`,
pero los handlers de módulo no deben depender de esperarla mediante esta
superficie de compatibilidad. Inyectar y usar `EventsDomain` directamente cuando
la finalización de la publicación sea parte del flujo de la aplicación.

## Archivos de controller WebSocket

Un módulo `full` puede definir múltiples archivos `websockets/**/*.ts`:

```ts
import type { ModuleWebSocketControllerDefinition } from 's42-core'

type OperatorSocketData = {
	operatorId: string
}

export default {
	name: 'operators.stream',
	version: '1.0.0',
	enabled: true,
	path: '/ws/operators/:operatorId',
	upgrade: ({ request, params }) => {
		if (!isAuthorized(request, params.operatorId)) {
			return new Response('Forbidden', { status: 403 })
		}

		return { data: { operatorId: params.operatorId } }
	},
	message: (ws, message) => ws.send(message),
} satisfies ModuleWebSocketControllerDefinition<OperatorSocketData>
```

Una definición habilitada requiere `name` y `version` string, `path` válido y
una función `upgrade`. Las propiedades opcionales de lifecycle/error deben ser
funciones. `enabled: false` omite el archivo antes de construir el controller.
Una definición habilitada inválida rechaza `load()` con archivo y motivo. Un
directorio `websockets/` ausente o vacío es válido.

Obtener los controllers con `getWebSocketControllers()` y pasarlos
explícitamente a un registro:

```ts
const sockets = new WebSocketControllers(modules.getWebSocketControllers())
await server.start({ port: 5678, WebSocketControllers: sockets })
```

Los `mws` HTTP, hooks globales y `requireBefore`/`requireAfter` de controllers no
se aplican al handshake ni lifecycle WebSocket. La autenticación debe vivir en
`upgrade`. El loader no inyecta el contexto HTTP `events.emit` en definiciones
WebSocket.

Ver [WEBSOCKETS](./WEBSOCKETS.es.md) para el contrato completo.

## Archivos de eventos

Con `EventsDomain` configurado:

- `events/emit.ts` registra todo export nombrado no-función salvo `default`,
  `EVENTS` y nombres terminados en `$Multiple`; el valor exportado no se usa;
- una función listener default de otro archivo se registra solamente si una
  configuración `EVENTS` aporta su nombre de evento;
- listeners nombrados usan su nombre de export como fallback cuando no hay
  mapping;
- `EVENTS` puede ser string/array para un handler default, un objeto global con
  `eventName` o `events`, o un mapa indexado por nombre de handler;
- `multiple` puede vivir en la entrada `EVENTS` del handler; handlers nombrados
  también soportan un export truthy `<handlerName>$Multiple`.

Cada nombre descubierto se prefija con el nombre del manifest antes de la
normalización de `EventsDomain`. Exports no-función de archivos listener y
exports función de `emit.ts` se ignoran.

Preferir mappings `EVENTS` explícitos para contratos estables.

## API de instancia

- `load()`
- `setEventsDomain(eventsDomain): this`
- `getControllers()`
- `getWebSocketControllers()`
- `getStaticRoutes()`
- `getHooks()`
- `getSharedModules()`
- `getLoadedModules()`
- `getServices()`
- `getModels()`
- `getTypes()`

`getModulesStats()` es un export independiente del paquete, no un método de
instancia.

## Comportamiento actual de compatibilidad

- `enabled: false` a nivel módulo omite el módulo.
- El `enabled` de metadata de controlador no se usa para omitirlo.
- Los archivos estáticos no pasan por hooks HTTP ni middleware de módulos. Usar
  un controller HTTP para archivos protegidos.
- El loader no parsea la metadata importada con el schema `Controllers`
  exportado.
- Los middleware `mws` se adjuntan a controladores opt-in, por lo que
  `getHooks()` no se completa con ellos.
- Models, services y types no se descubren automáticamente; sus getters
  devuelven colecciones vacías o `undefined`.
- Un directorio `controllers/`, `websockets/` o `events/` ausente es válido para
  `full`.
- Un contrato `mws/index.ts` ausente o inválido lanza error y detiene `load()`.
- `setEventsDomain()` debe llamarse antes de `load()` para registrar archivos
  de eventos. Configurarlo después no vuelve a escanear eventos omitidos.
- `load()` no tiene guard de idempotencia ni rollback. Repetirlo puede agregar
  controllers duplicados y ejecutar otra vez la inicialización; una falla puede
  dejar registrados componentes cargados antes durante esa invocación.
- Fallas de discovery, import o inicialización rechazan inmediatamente. El
  loader no continúa con los módulos restantes.

## Estadísticas

`getModulesStats()` devuelve totales por tipo, incluido `totalModulesStatic`,
nombres y manifests normalizados de módulos cargados. Su registro es global al
proceso.

Las estadísticas de controllers WebSocket y conexiones activas usan el registro
separado, global al proceso, `getWebSocketControllersStats()`.
