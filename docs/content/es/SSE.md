# SSE

## Propósito

`SSE` crea una respuesta `text/event-stream` respaldada por el controlador de
stream directo de Bun.

Necesita el `Request` Web crudo para observar `request.signal`.

## Constructor y API

```ts
const stream = new SSE(request)
```

- `getResponse(): Response`
- `getUUID(): string`
- `send({ eventName, eventPayload }): void`
- `close(): void`

Formato del evento:

```text
id: 0
event: tick
data: {"now":123}

```

Los IDs incrementan por instancia `SSE`.

## Ejemplo con ruta Bun cruda

```ts
import { SSE } from 's42-core'

Bun.serve({
	port: 3000,
	routes: {
		'/stream': (request: Request) => {
			const stream = new SSE(request)
			const timer = setInterval(() => {
				stream.send({
					eventName: 'tick',
					eventPayload: { now: Date.now() },
				})
			}, 1_000)

			request.signal.addEventListener('abort', () => {
				clearInterval(timer)
				stream.close()
			})

			return stream.getResponse()
		},
	},
})
```

## Restricción de integración con RouteControllers

Los handlers normales de S42-Core reciben el objeto request normalizado por
`RouteControllers`, no el `Request` crudo. Ese objeto no incluye hoy `signal`.

Por eso, el patrón anterior `new SSE(req)` dentro de un `Controller` normal no
puede detectar correctamente la desconexión del cliente. Usar `SSE` solamente
desde una superficie de routing que conserve el request Web crudo hasta que ese
contrato se extienda.

## Notas de runtime

- La respuesta define hoy solamente `Content-Type: text/event-stream`.
- El stream directo hace flush cada segundo hasta que el request se aborta.
- Un `send()` anterior a que Bun entregue el controlador directo puede perderse.
- Detener timers y liberar recursos siempre al abortar.
- `close()` captura y registra errores, incluso cierres repetidos.
