# RESPONSE (`Res`)

## Propósito

`Res` es el builder de respuestas que reciben los callbacks de los
controladores. Cada método terminal devuelve un `Response` Web.

`RouteControllers` lo construye con los headers default del framework. El uso
directo dentro del repositorio requiere
`new Res({ headers?: Record<string, string> })`; el status inicial es `200` y el
tipo de opciones del constructor no es un export nombrado de la raíz.

## API

- `status(code): this`
- `setHeader(key, value): void`
- `json(data): Response`
- `send(data): Response`
- `html(data): Response`
- `text(data): Response`
- `redirect(url): Response`

## Ejemplo

```ts
import { Controller } from 's42-core'

const create = new Controller('POST', '/items', async (_req, res) => {
	res.setHeader('X-Resource-Type', 'item')
	return res.status(201).json({ ok: true })
})
```

## Tipos de contenido

- `json()` define `Content-Type: application/json`.
- `html()` define `Content-Type: text/html`.
- `text()` define `Content-Type: text/plain`.
- `send()` conserva los headers existentes y no define content type.
- `redirect()` define `Location`, fuerza status `302` y devuelve body vacío.

Los headers provistos por `RouteControllers` se copian a la respuesta generada.
`setHeader()` no es encadenable.

Cada llamada terminal toma un snapshot del mapa de headers actual en un nuevo
Web `Response`. Llamadas posteriores a `setHeader()` o `status()` no mutan una
respuesta ya creada.

## Notas

- Retornar el `Response` generado desde cada handler o middleware que finaliza
  la cadena.
- `json()` acepta objetos; serializar primitivas explícitamente cuando
  corresponda.
- Los valores de headers se guardan como strings y luego se pasan al
  constructor Web `Response`.
