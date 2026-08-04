# GETTING STARTED

S42-Core is a Bun-first backend framework built around small, autonomous
modules. This guide starts with working examples; use the component references
when you need the exact contract or current limitations.

## 1. Install

```bash
bun add s42-core
```

S42-Core requires Bun 1.3 or newer and exposes its public API from the package
root:

```ts
import { Controller, RouteControllers, Server } from 's42-core'
```

## 2. Run one route

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

Run it:

```bash
bun run server.ts
curl http://localhost:3000/health
```

The explicit `error` callback avoids exposing the default stack-bearing HTML
error response. See [Server](./SERVER.md), [RouteControllers](./ROUTECONTROLLERS.md),
[Controller](./CONTROLLER.md), and [Res](./RESPONSE.md).

## 3. Turn the route into a module

Recommended structure:

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

Bootstrap all discovered modules:

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

`Modules.load()` discovers `**/__module__.ts`, validates manifests, and loads
enabled `mws`, `share`, then `full` modules. Read [Modules](./MODULES.md) before
depending on middleware or event-file conventions.

## 4. Make an atomic SQL change

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
		// Retry the complete transaction with an application-defined policy.
	}
	throw error
}
```

Use the scoped `transaction` argument for every query that must be atomic.
Transactions do not replace constraints, conditional writes, idempotency keys,
or a retry policy. Read the complete [SQL guide](./SQL.md) for filters,
savepoints, distributed transactions, raw execution, indexes, errors, and
adapter differences.

## 5. Publish a domain event

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

The bundled event layer is distributed routing, not durable processing:
`emit() === true` is not an acknowledgement from a handler. Use an outbox or a
queue topology with explicit retry/dead-letter semantics when delivery is a
business invariant. See [EventsDomain](./EVENTSDOMAIN.md) and
[Redis](./REDISDB.md).

## 6. Production checklist

- Provide a sanitized `Server.error` callback.
- Enforce your CORS policy at a trusted boundary; router CORS headers are fixed.
- Call explicit database `connect()` methods during startup and close clients
  during shutdown.
- Validate and cap pagination inputs at the HTTP boundary.
- Keep `CoreStats` disabled or protect it with a trusted network/auth boundary.
- Treat MongoDB, Redis, and EventsDomain singleton configuration as
  first-call-wins.
- Test PostgreSQL, MySQL, Redis, SQS, TLS, and shutdown behavior against the
  deployment environment, not only with unit tests.

For the complete source-aligned reference, continue with
[ALL_EN](./ALL_EN.md).
