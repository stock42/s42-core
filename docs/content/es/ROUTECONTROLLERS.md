# ROUTECONTROLLERS

## Propósito

`RouteControllers` compone instancias de `Controller`, genera rutas nativas de
Bun, provee un matcher fallback, normaliza requests y ejecuta hooks globales.

## Constructor

```ts
const router = new RouteControllers(controllers)
```

- `controllers: Controller[]`

Con `ENABLE_CORE_STATS=true` o `1`, el constructor también inyecta
`GET /core/stats`, salvo que ya exista ese método/path exacto.

## API pública

### `getRoutes(hooks)`

Devuelve el objeto enviado a `Bun.serve({ routes })`.

Los métodos elegibles son `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS` y
`HEAD`. Los paths con `*`, el método `*` y el no estándar `UPDATE` quedan fuera
del mapa nativo.

### `getCallback(hooks)`

Devuelve el callback `fetch` fallback. Soporta segmentos exactos, `:params`,
wildcards y método `*`. El primer segmento `*` detiene la comparación y consume
el sufijo restante; no se verifican segmentos escritos después del wildcard.

Rutas sin match devuelven `404 Not Found` en texto plano. Excepciones del
matching fallback, parseo o dispatch se registran y se convierten en
`500 Internal Server Error` de texto plano.

## Request normalizado

Los callbacks reciben un objeto del framework, no el `Request` Web crudo:

```ts
{
	headers: Headers
	realIp: string
	query: Record<string, string>
	body: Record<string, unknown>
	url: string
	method: string
	params: Record<string, string>
	formData: () => FormData
}
```

Detalles de parseo:

- Todo body no GET y no-form se lee y parsea como JSON sin importar el content
  type declarado; un body vacío o JSON inválido se convierte en `{}`.
- Formularios multipart y URL-encoded se parsean una vez y se exponen mediante
  `formData()`.
- Una falla al parsear form produce un `FormData` vacío.
- Los valores de query conservan `=`, decodifican percent escapes y, ante claves
  repetidas, prevalece el último valor. Las keys de query no se decodifican. Un
  percent escape inválido lanza y se convierte en el response fallback `500`.
- `realIp` confía primero en `x-forwarded-for`, luego en `cf-connecting-ip` y
  finalmente usa `::1`.
- No se incluyen el request crudo ni `Request.signal`.

Confiar en headers de IP reenviados solamente detrás de un proxy controlado.

## Hooks globales

Los hooks matchean método y path mediante segmentos exactos, `:param` o `*`.

Orden:

1. hooks `before` matcheados;
2. callback del controlador;
3. hooks `after` matcheados.

Semántica actual:

- Los hooks globales reciben el `Request` Web crudo, mientras los callbacks de
  controller reciben el objeto normalizado anterior. El argumento `res` del
  hook es el builder S42-Core `Res` en runtime aunque el contrato público actual
  `TypeHook` lo tipa como Web `Response`.
- El pipeline avanza automáticamente aunque un hook no llame a `next()`.
- Retornar un `Response` no corta ni reemplaza la respuesta de la ruta.
- Un error lanzado en `before` devuelve JSON con status `401` si su mensaje
  coincide con token/auth/unauthorized/forbidden; los demás devuelven `500`.
- Un error de `after` se registra y se conserva la respuesta del controlador.
- Los hooks `after` no pueden modificar el response ya construido.

## Headers default y CORS

Cada ruta despachada recibe headers no-cache fijos, CSP y:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Headers: Accept, Authorization, Content-Type, X-Requested-With, Range, apikey, x-access-token
Access-Control-Expose-Headers: Content-Length
Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self';
```

No existe hoy una opción pública para configurar CORS. La combinación de
wildcard con credenciales no es adecuada para requests credencializados de
browser. Aplicar una política explícita de orígenes en un reverse proxy
confiable u otra frontera aprobada antes de publicar un servicio.

Un request `OPTIONS` matcheado devuelve `204`. Si antes no matchea una ruta
`OPTIONS` o wildcard, el fallback todavía puede devolver `404`.

## Ejemplo

```ts
import { Controller, RouteControllers, Server } from 's42-core'

const health = new Controller('GET', '/health', async (_req, res) => {
	return res.json({ ok: true })
})

const server = new Server()
await server.start({
	port: 3000,
	RouteControllers: new RouteControllers([health]),
	hooks: [
		{
			method: '*',
			path: '*',
			when: 'before',
			handle: (req, res, next) => {
				console.info(req.method, new URL(req.url).pathname)
				next(req, res)
			},
		},
	],
})
```
