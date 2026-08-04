# MODULES

## Propósito

`Modules` descubre `**/__module__.ts` con `Bun.Glob`, valida manifests mediante
Zod y carga comportamiento según el tipo de módulo.

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
- `type?: 'mws' | 'share' | 'full'` (default: `full`)
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
3. todos los `full`.

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
types, models, controllers, eventos ni hooks. Los directorios `controllers/`,
`events/` y `mws/` se ignoran con un warning.

### `full`

Importa todos los archivos TypeScript bajo `controllers/` y opcionalmente
`events/`. Cada archivo de controlador debe tener un default export compatible.

`initialize` se espera después de la carga propia del tipo. Para `full`, esto
ocurre luego de controllers y eventos.

## Constructor

```ts
const modules = new Modules('./modules', eventsDomain?)
```

El path se normaliza respecto de `process.cwd()`, salvo que sea absoluto.

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
- El loader no parsea la metadata importada con el schema `Controllers`
  exportado.
- Los middleware `mws` se adjuntan a controladores opt-in, por lo que
  `getHooks()` no se completa con ellos.
- Models, services y types no se descubren automáticamente; sus getters
  devuelven colecciones vacías o `undefined`.
- Un directorio `controllers/` o `events/` ausente es válido para `full`.
- Un contrato `mws/index.ts` ausente o inválido lanza error y detiene `load()`.
- `setEventsDomain()` debe llamarse antes de `load()` para registrar archivos
  de eventos. Configurarlo después no vuelve a escanear eventos omitidos.
- `load()` no tiene guard de idempotencia ni rollback. Repetirlo puede agregar
  controllers duplicados y ejecutar otra vez la inicialización; una falla puede
  dejar registrados componentes cargados antes durante esa invocación.
- Fallas de discovery, import o inicialización rechazan inmediatamente. El
  loader no continúa con los módulos restantes.

## Estadísticas

`getModulesStats()` devuelve totales por tipo, nombres y manifests normalizados
de módulos cargados. Su registro es global al proceso.
