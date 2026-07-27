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

## Archivos de eventos

Con `EventsDomain` configurado:

- los exports nombrados no-función de `events/emit.ts` registran emisores;
- los exports función de otros archivos registran listeners;
- `EVENTS` puede mapear handlers a `eventName`/`events` y `multiple`;
- las funciones nombradas usan su nombre de export como fallback.

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

## Estadísticas

`getModulesStats()` devuelve totales por tipo, nombres y manifests normalizados
de módulos cargados. Su registro es global al proceso.
