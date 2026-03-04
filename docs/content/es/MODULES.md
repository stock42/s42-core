# MODULES

## Proposito

`Modules` es el cargador dinamico de modulos en S42-Core.
Descubre archivos `__module__.ts`, valida manifests con `zod` y carga capacidades segun el tipo de modulo.

## Tipos de modulo soportados

1. `mws`
Modulos middleware. Deben exponer `mws/index.ts` con:
- `default` (constructor/init)
- `beforeRequest`
- `afterRequest` (o alias `exportRequest`)

2. `share`
Modulos compartidos para codigo reutilizable. No registran controllers/events/hooks.

3. `full`
Modulos de dominio con controladores y eventos opcionales.

## Orden de carga

1. Todos los `mws`
2. Todos los `share`
3. Todos los `full`

Esto garantiza disponibilidad de middleware antes de cargar controladores `full`.

## Activacion de middleware por controlador

El middleware es bajo demanda (no global por defecto).
Los controladores pueden solicitar middleware via:

- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)

Modos de referencia:

- `['mws']`: todos los modulos middleware
- `['auth']`: un modulo middleware puntual por nombre

## Constructor

```ts
const modules = new Modules('./modules', eventsDomain?)
```

## API publica

- `load()`
- `setEventsDomain(eventsDomain)`
- `getControllers()`
- `getHooks()`
- `getSharedModules()`
- `getServices()`
- `getModels()`
- `getTypes()`

## Ejemplo de manifest

```ts
export default {
  name: 'operators',
  version: '1.0.0',
  type: 'full',
  dependencies: [{ module: 'auth', version: 1 }],
}
```

## Ejemplo de controlador con middleware on-demand

```ts
export default {
  name: 'operatorList',
  version: '1.0.0',
  method: 'GET',
  path: '/operators/list',
  requireBefore: ['mws'],
  handler: async (req, res) => res.json({ ok: true }),
}
```

## Notas

- Los modulos `share` ignoran `controllers/`, `events/` y `mws/`.
- Los archivos en `events/` se registran automaticamente si `EventsDomain` esta configurado.
- Mantener contratos de modulo estrictos y versionados.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
