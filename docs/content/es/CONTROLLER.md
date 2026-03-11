# CONTROLLER

## Proposito

`Controller` define handlers de endpoints y composicion de middlewares por ruta.

Mantiene:

- un `path`
- uno o mas metodos HTTP
- una cadena de middlewares ejecutada en orden

## Constructor

```ts
const c = new Controller(method, path, callback)
```

- `method: TYPE_HTTP_METHOD`
- `path: string`
- `callback: Middleware`

## Metodos

- `setPath(path)`
- `getPath()`
- `getMethods()`
- `get()`, `post()`, `put()`, `patch()`, `delete()`, `options()`, `update()`
- `use(callback)`
- `getCallback()`

## Comportamiento de middleware

`use(callback)` inserta al inicio (`LIFO`):

- el ultimo `use()` corre primero.
- si un middleware retorna `Response`, la cadena se corta.
- si retorna `void`, continua el siguiente middleware.

## Ejemplo

```ts
import { Controller } from 's42-core'

const usersList = new Controller('GET', '/users', async (_req, res) => {
  return res.json({ ok: true, items: [] })
})

usersList.use(async (req, res) => {
  if (!req.headers.get('authorization')) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
})
```

## Notas

- Retornar `Response` de forma explicita mejora la predictibilidad.
- Mantener middlewares acotados (auth, validacion, normalizacion).
- `update()` y `UPDATE` existen hoy en la API, pero conviene revisarlos por consistencia HTTP estandar.
- Esta pagina documenta `new Controller(...)`. La metadata `ControllerType` cargada via `Modules` usa `handler(req, res, { events })`.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
