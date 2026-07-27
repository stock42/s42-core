# Ejemplo Operators (`type: "full"`)

El repositorio incluye `modules/operators` como ejemplo pequeño de módulo
`full`.

## Estructura

```text
operators/
  __module__.ts
  controllers/
    operatorList.ts
```

No existe un directorio `events/` versionado en el checkout actual.

## Salvedad del repositorio actual

El controlador versionado contiene `import {} from '../events/emit'`, pero
`events/emit.ts` no existe. Por eso, `bun run typecheck:modules` falla
actualmente con `TS2307`. El controlador siguiente muestra el contrato público
esperado en lugar de copiar ese import obsoleto.

## Manifest

```ts
export default {
	name: 'operators',
	version: '1.0.0',
	type: 'full', // opcional; full es el default
	dependencies: [{ module: 'auth', version: 1 }],
	initialize: () => {
		console.info('operators ready')
	},
}
```

`dependencies` es solamente metadata. El ejemplo puede cargar aunque no exista
un módulo auth porque el loader no lo resuelve.

## Controlador

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'operatorList',
	version: '1.0.0',
	method: 'GET',
	path: '/operators/list',
	handler: async (_req, res, { events }) => {
		events.emit('Operator$List$Completed', { ok: true })
		return res.json({ ok: true, docs: [] })
	},
	handleError: async (_req, res, error) => {
		return res.status(500).json({ ok: false, error: String(error) })
	},
} satisfies ControllerType
```

Con `EventsDomain` configurado, el evento se convierte en:

```text
OPERATORS.OPERATOR.LIST.COMPLETED
```

## Comportamiento

- Se importa cada archivo TypeScript bajo `controllers/`.
- El campo `enabled` del controlador no se exige actualmente.
- `requireBefore`/`requireAfter` hacen opt-in a módulos `mws`.
- `initialize` corre después de cargar controllers y eventos.
- La ausencia de directorio `controllers/` o `events/` es válida.
