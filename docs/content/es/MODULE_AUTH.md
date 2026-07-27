# Template de módulo Auth (`type: "mws"`)

Este es un template para un módulo middleware de autenticación. El repositorio
no incluye actualmente un módulo auth listo para usar.

## Estructura requerida

```text
auth/
  __module__.ts
  mws/
    index.ts
```

## Manifest

```ts
export default {
	name: 'auth',
	version: '1.0.0',
	type: 'mws',
	enabled: true,
}
```

## `mws/index.ts`

Exports requeridos:

- función default de inicialización;
- `beforeRequest`;
- `afterRequest`, o alias de compatibilidad `exportRequest`.

```ts
export default async () => {
	// inicialización one-time
}

export async function beforeRequest(req, res, next) {
	if (!req.headers.get('authorization')) {
		throw new Error('Token required')
	}
	next(req, res)
}

export function afterRequest(req, res, next) {
	next(req, res)
}
```

El request es el objeto normalizado de `RouteControllers`. El pipeline avanza
automáticamente cuando se omite `next()`.

## Opt-in del controlador

```ts
requireBefore: ['auth']
requireAfter: ['auth']
```

`['mws']` selecciona todos los módulos middleware cargados. `beforeRequest` y
`afterRequest` son aliases de los campos metadata `require*`.

## Comportamiento actual de errores/respuestas

Retornar un `Response` desde un handler `mws` no corta el controlador. Lanzar
un error para indicar fallo; el `handleError` del controlador, si existe, decide
la respuesta HTTP. Sin él, el wrapper `Controller` sigue su camino genérico de
`500`.

Mapear fallos de autenticación a `401`/`403` explícitamente en `handleError` y no
exponer detalles de parsing o verificación del token.
