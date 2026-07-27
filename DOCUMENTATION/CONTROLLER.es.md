# CONTROLLER

## Propósito

`Controller` representa un path, uno o más métodos HTTP y una cadena local de
middlewares.

Esta clase es distinta de los objetos metadata `ControllerType` cargados desde
el directorio `controllers/` de un módulo.

## Constructor

```ts
const controller = new Controller(method, path, callback)
```

- `method`: `GET`, `POST`, `PUT`, `DELETE`, `UPDATE`, `PATCH`, `OPTIONS` o `*`
- `path: string`
- `callback(req, res)`

La construcción también registra el controlador en el registro de estadísticas
del proceso usado por `getControllersStats()` y `CoreStats`.

## API

- `setPath(path): this`
- `getPath(): string`
- `getMethods(): TYPE_HTTP_METHOD[]`
- `get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `update()`
- `use(callback): this`
- `getCallback()`

Los helpers de métodos agregan otro método aceptado sobre el mismo path:

```ts
const users = new Controller('GET', '/users', listUsers).post()
```

`UPDATE` es un método de compatibilidad, no un método HTTP estándar, y queda
fuera del mapa de rutas nativas de Bun.

## Comportamiento de middleware

`use(callback)` antepone un callback:

- el último `use()` se ejecuta primero;
- retornar un `Response` corta la cadena;
- cualquier otro valor avanza al callback siguiente;
- los errores lanzados se convierten en una respuesta JSON `500`;
- una cadena que termina sin respuesta devuelve `End without response`.

El callback del constructor se agrega mediante `use()`, por lo que llamadas
posteriores a `use()` corren antes.

## Ejemplo

```ts
import { Controller } from 's42-core'

const usersList = new Controller('GET', '/users', async (_req, res) => {
	return res.json({ ok: true, items: [] })
})

usersList.use(async (req, res) => {
	const headers = (req as { headers: Headers }).headers
	if (!headers.get('authorization')) {
		return res.status(401).json({ ok: false, error: 'Unauthorized' })
	}
})
```

## Metadata de controlador de módulo

`Modules` importa objetos con esta forma:

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'users.list',
	version: '1.0.0',
	method: 'GET',
	path: '/users',
	handler: async (_req, res, { events }) => {
		events.emit('User$List$Completed', { ok: true })
		return res.json({ ok: true })
	},
} satisfies ControllerType
```

El loader envuelve esta metadata en un `Controller`. El campo opcional
`enabled` del controlador es solamente metadata y no se usa hoy para omitirlo.

## Estadísticas

`getControllersStats()` devuelve:

```ts
{
	totalControllers: number
	totalEndpoints: number
	endpoints: Array<{ method: string; path: string }>
}
```

Los pares método/path se deduplican y ordenan por path y método.
