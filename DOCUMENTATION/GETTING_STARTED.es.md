# EMPEZAR

S42-Core es un framework backend Bun-first basado en módulos pequeños y
autónomos. Esta guía comienza con ejemplos funcionales; usar las referencias de
cada componente para consultar el contrato exacto y sus límites actuales.

## 1. Instalar

```bash
bun add s42-core
```

S42-Core requiere Bun 1.3 o superior y expone su API pública desde la raíz del
paquete:

```ts
import { Controller, RouteControllers, Server } from 's42-core'
```

## 2. Ejecutar una ruta

```ts
import { Controller, RouteControllers, Server } from 's42-core'

const health = new Controller('GET', '/health', async (_req, res) => {
	return res.json({ ok: true, runtime: 'bun' })
})

const router = new RouteControllers([health])
const server = new Server()

await server.start({
	port: 3000,
	RouteControllers: router,
	hooks: [],
	error: error => {
		console.error(error)
		return Response.json({ ok: false, error: 'Internal Server Error' }, { status: 500 })
	},
})

console.info(`Listening at ${server.getURL()}`)
```

Ejecutarlo:

```bash
bun run server.ts
curl http://localhost:3000/health
```

El callback `error` explícito evita exponer la respuesta HTML default que
incluye stack. Ver [Server](./SERVER.es.md),
[RouteControllers](./ROUTECONTROLLERS.es.md),
[Controller](./CONTROLLER.es.md) y [Res](./RESPONSE.es.md).

## 3. Convertir la ruta en un módulo

Estructura recomendada:

```text
modules/
  health/
    __module__.ts
    controllers/
      health.ts
```

`modules/health/__module__.ts`:

```ts
export default {
	name: 'health',
	version: '1.0.0',
	type: 'full',
	enabled: true,
}
```

`modules/health/controllers/health.ts`:

```ts
import type { ControllerType } from 's42-core'

export default {
	name: 'health.read',
	version: '1.0.0',
	method: 'GET',
	path: '/health',
	handler: async (_req, res) => res.json({ ok: true }),
} satisfies ControllerType
```

Bootstrap de todos los módulos descubiertos:

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

await new Server().start({
	port: 3000,
	RouteControllers: new RouteControllers(modules.getControllers()),
	hooks: modules.getHooks(),
})
```

`Modules.load()` descubre `**/__module__.ts`, valida manifests y carga módulos
habilitados en orden `mws`, `share` y `full`. Leer [Modules](./MODULES.es.md)
antes de depender de convenciones de middleware o archivos de eventos.

## 4. Hacer un cambio SQL atómico

```ts
import { SQL, isSQLError } from 's42-core'

const db = new SQL({
	type: 'postgres',
	url: process.env.DATABASE_URL,
	max: 10,
	connectionTimeout: 10,
	connection: { statement_timeout: 15_000 },
})

await db.connect()

try {
	await db.transaction(async transaction => {
		const changed = await transaction.update({
			tableName: 'invitation_codes',
			whereClause: { uuid: code, used_count: 0 },
			data: { used_count: 1 },
		})

		if (changed !== 1) throw new Error('Invitation code is already used')

		await transaction.insert(
			'code_redemptions',
			{ invitation_code_uuid: code, redeemed_by: userId },
			{ returning: ['id', 'created_at'] },
		)
	})
} catch (error) {
	if (isSQLError(error, 'serialization_failure')) {
		// Reintentar la transacción completa con una política de la aplicación.
	}
	throw error
}
```

Usar el argumento scoped `transaction` para cada query que deba ser atómica.
Las transacciones no reemplazan constraints, writes condicionales, claves de
idempotencia ni una política de retry. Leer la guía completa de
[SQL](./SQL.es.md) para filtros, savepoints, transacciones distribuidas,
ejecución raw, índices, errores y diferencias entre adaptadores.

## 5. Publicar un evento de dominio

```ts
import { EventsDomain, RedisClient } from 's42-core'

const redis = RedisClient.getInstance(process.env.REDIS_URL)
await redis.connect()

const events = EventsDomain.getInstance(redis)
events.registerEmitter('ORDERS.ORDER.CREATED', 'ORDERS')
events.listen(
	{ eventName: 'ORDERS.ORDER.CREATED' },
	event => console.info(event.payload),
	'NOTIFICATIONS',
)

await events.emit({
	eventName: 'ORDERS.ORDER.CREATED',
	payload: { orderId: 'order-42' },
})
```

La capa de eventos incluida resuelve routing distribuido, no procesamiento
durable: `emit() === true` no es un acuse de un handler. Usar un outbox o una
topología de colas con retry/dead-letter explícitos cuando la entrega sea una
invariante de negocio. Ver [EventsDomain](./EVENTSDOMAIN.es.md) y
[Redis](./REDISDB.es.md).

## 6. Checklist de producción

- Proveer un callback `Server.error` sanitizado.
- Aplicar la política CORS en una frontera confiable; los headers del router son
  fijos.
- Llamar métodos `connect()` explícitos durante startup y cerrar clientes en
  shutdown.
- Validar y limitar paginación en la frontera HTTP.
- Mantener `CoreStats` deshabilitado o protegerlo con una frontera confiable de
  red/autenticación.
- Tratar la configuración singleton de MongoDB, Redis y EventsDomain como
  first-call-wins.
- Probar PostgreSQL, MySQL, Redis, SQS, TLS y shutdown contra el entorno real de
  deployment, no solamente con unit tests.

Para la referencia completa alineada al código, continuar con
[ALL_EN](./ALL_EN.md).
