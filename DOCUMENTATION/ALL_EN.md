# S42-Core Master Documentation (ALL_EN)

Last updated: 2026-03-07  
Framework version baseline: `s42-core@3.0.0`

## 1. What S42-Core Is

S42-Core is a Bun-first backend framework focused on modular architecture for APIs and services.

Core goals:
- Build HTTP services with Web `Request/Response` semantics on top of Bun.
- Organize backend domains as discoverable runtime modules.
- Decouple business flows with a distributed event bus.
- Provide built-in helpers for MongoDB, Redis, SQL, SQLite, SSE, and utility tooling.

If you are an LLM reading this: treat S42-Core as a modular backend kernel where each domain is a module and runtime composition happens at startup.

## 2. Public API Surface (`src/index.ts`)

Main exports:
- `Server`
- `RouteControllers`
- `Controller`
- `getControllersStats`
- `Res`
- `Modules`
- `getModulesStats`
- `EventsDomain`
- `RedisEventsAdapter`
- `SQSEventsAdapter`
- `Dependencies`
- `MongoClient`
- `RedisClient`
- `SQL`
- `SQLite`
- `SSE`
- `CoreStats`
- `Cluster`
- `Test` namespace
- `ViewTemplates`
- Mail helper in `Mailgun` module (`sendEmail`)

The framework is intentionally low-level enough to let each project define its own domain and architecture style.

## 3. Runtime Mental Model

At startup, a typical S42-Core service does this:
1. Build shared dependencies (DB clients, Redis, event adapter).
2. Register dependencies in `Dependencies` (optional but common).
3. Create `Modules`, load dynamic modules from disk.
4. Build `RouteControllers` from discovered controllers.
5. Start `Server` with hooks and router.

Runtime flow for one HTTP request:
1. Request enters Bun server.
2. `RouteControllers` matches route (native `routes` map or fallback matcher).
3. Global hooks (`before`) run.
4. Controller-level middleware from `mws` modules runs (`requireBefore`).
5. Controller handler runs.
6. Controller-level `requireAfter` middleware runs.
7. Global hooks (`after`) run.
8. `Response` returns.

Runtime flow for one domain event:
1. Event name is normalized (uppercase, `A.B.C` style).
2. Event must have emitter registration.
3. Event is routed to listener instances via adapter channels.
4. One listener or many listeners execute depending on `multiple` flag.

## 4. Module System (Most Important Concept)

`Modules` (`src/Modules/index.ts`) discovers `**/__module__.ts` with `Bun.Glob` and loads modules by type.

### 4.1 Module Manifest Contract

Runtime schema (`zod`) requires:

```ts
{
  name: string
  version: string
  type?: 'mws' | 'full' | 'share' // defaults to 'full'
  enabled?: boolean // defaults to true
}
```

Notes:
- Additional keys (for example `dependencies`) can exist in files, but the loader currently uses `name`, `version`, `type`, and `enabled` for behavior.
- If `type` is omitted, module is treated as `full`.
- If `enabled` is `false`, the module is skipped entirely during discovery.

### 4.2 Module Types

#### Type `mws`
Purpose: reusable request middleware modules.

Required structure:

```text
auth/
  __module__.ts
  mws/
    index.ts
```

`mws/index.ts` must export:
- `default` constructor/init function
- `beforeRequest`
- `afterRequest` (or alias `exportRequest`)

Real example (`modules/auth/mws/index.ts`) uses JWT validation and appends `req.user`.

#### Type `share`
Purpose: shared reusable code only (types, constants, utilities, services, etc).

Runtime behavior:
- Registered as shared module metadata.
- `controllers/`, `events/`, and `mws/` directories are ignored (with warning).
- No HTTP routes or events are loaded from share modules.

#### Type `full`
Purpose: domain module with controllers and optional events.

Typical structure:

```text
properties/
  __module__.ts
  controllers/
  events/
  models/
  services/
```

`full` modules can:
- expose HTTP endpoints via `controllers/*.ts`
- register event emitters/listeners via `events/*.ts`
- use `mws` modules on-demand per controller

### 4.3 Actual Load Order

`Modules.load()` executes in this order:
1. Discover all modules.
2. Skip manifests with `enabled: false`.
3. Load all `mws` modules.
4. Load all `share` modules.
5. Load all `full` module controllers.
6. Load all `full` module events.

This guarantees middleware exists before full controllers are built.

### 4.4 Controller-Level Middleware Resolution

Controller metadata fields supported by loader:
- `requireBefore?: string[]`
- `requireAfter?: string[]`
- `beforeRequest?: string[]` (alias)
- `afterRequest?: string[]` (alias)
- `handler(req, res, { events })`

Reference modes:
- `['mws']` => all loaded middleware modules
- `['auth']` => one specific middleware module by module name

`handler` receives a third runtime argument:

```ts
{
  events: {
    emit(eventName: string, payload?: object)
  }
}
```

`events.emit()` is namespaced automatically with the module name at runtime.

Example from repo:

```ts
export default {
  method: 'POST',
  path: '/operators/create',
  requireBefore: ['auth'],
  handler: async (req, res, { events }) => {
    events.emit('Operator$Create$Started', { actor: req.user?.uuid })
    return res.json({ ok: true })
  },
}
```

### 4.5 Module Event Auto-Registration

When `EventsDomain` is configured in `Modules`, `events/` files are auto-loaded:
- `emit.ts`: non-function exports are treated as emitter declarations.
- other files: function exports are treated as listeners.

Important naming behavior:
- Event names are normalized in `EventsDomain` (`$` converted to `.`, uppercase).
- If you do not provide explicit `EVENTS` mapping, listener export function names become event names.

Recommended explicit listener mapping pattern:

```ts
// modules/orders/events/order.approved.ts
export const EVENTS = {
  onApproved: { eventName: 'ORDERS.APPROVED.CREATED', multiple: false },
}

export async function onApproved(event: EventType) {
  // ...
}
```

This avoids accidental mismatch from function name inference.

## 5. HTTP Layer

## 5.1 `Server`

`Server.start()` options:

```ts
type TypeServerConstructor = {
  port: number
  clustering?: boolean
  idleTimeout?: number
  maxRequestBodySize?: number
  error?: (err: unknown) => Response
  hooks?: TypeHook[]
  RouteControllers?: RouteControllers
  development?: boolean
  awaitForCluster?: boolean
}
```

Minimal bootstrap:

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

const server = new Server()
await server.start({
  port: 5678,
  RouteControllers: new RouteControllers(modules.getControllers()),
  hooks: modules.getHooks(),
})
```

Global hook example:

```ts
const hooks = [
  {
    method: '*',
    path: '*',
    when: 'before' as const,
    handle: async (req, res, next) => {
      console.info(`[${req.method}] ${new URL(req.url).pathname}`)
      next(req, res)
    },
  },
]
```

## 5.2 `RouteControllers`

Responsibilities:
- Route map caching for fast lookup.
- Parameter and wildcard matching.
- Request normalization.
- Hook matching/execution by method and path.

Controller receives a normalized request object (not raw `Request`):

```ts
{
  headers: Headers
  realIp: string
  query: Record<string, string>
  body: Record<string, any>
  url: string
  method: string
  params: Record<string, string>
  formData: () => FormData
}
```

Routing features:
- Static paths (`/health`)
- Param paths (`/users/:id`)
- Wildcards (`/public/*`)
- Method wildcard hooks (`method: '*'`)

## 5.3 `Controller`

`Controller` is a route + middleware chain unit.

Constructor:

```ts
new Controller(method, path, callback)
```

Methods:
- HTTP method extension: `.get()`, `.post()`, `.put()`, `.patch()`, `.delete()`, `.options()`, `.update()`
- middleware composition: `.use(fn)`
- callback retrieval: `.getCallback()`

Middleware chain behavior:
- `use()` prepends middleware (LIFO execution).
- If middleware returns a `Response`, chain short-circuits.
- If middleware returns `void`, next middleware runs.

Example:

```ts
import { Controller } from 's42-core'

const endpoint = new Controller('GET', '/secure', async (_req, res) => {
  return res.json({ ok: true })
})

endpoint.use(async (req, res) => {
  const hasAuth = Boolean((req as Request).headers.get('authorization'))
  if (!hasAuth) {
    return res.status(401).json({ ok: false, msg: 'Unauthorized' })
  }
})
```

## 5.4 `Res`

Utility response builder:
- `status(code)`
- `setHeader(key, value)`
- `json(object)`
- `send(string)`
- `html(string)`
- `text(string)`
- `redirect(url)`

Example:

```ts
handler: async (_req, res) => {
  return res
    .status(201)
    .json({ ok: true, id: Bun.randomUUIDv7() })
}
```

## 6. EventsDomain Deep Dive

`EventsDomain` is a singleton distributed event registry and dispatcher.

Default adapter: Redis (`RedisEventsAdapter`).  
Optional adapter: SQS (`SQSEventsAdapter`).

### 6.1 Event Name Rules

Rules enforced by runtime:
- Uppercase semantic segments.
- At least 3 segments (`A.B.C`) for standard events.
- Allowed chars per segment: `[A-Z0-9_-]`.
- `$` in source names is converted to `.`.

Examples:
- `Operator$Signup$Approved` -> `OPERATOR.SIGNUP.APPROVED`
- With module name `operators` passed during registration -> `OPERATORS.OPERATOR.SIGNUP.APPROVED`

### 6.2 Main API

```ts
events.registerEmitter(eventName, moduleName?)
events.listen({ eventName, multiple? }, handler, moduleName?)
await events.emit({ eventName, payload })
events.setAdapter(adapter)
events.getAllRegisteredEvents()
events.getAllRegisteredEventsIntoCluster()
```

Backward-compatible aliases:
- `listenEvent(name, callback)`
- `emitEvent(name, payload)`

### 6.3 Single vs Multiple Listener Delivery

- `multiple: false` (default): one listener target per emit.
- `multiple: true`: listener delivery can rotate across instances using internal cursor logic.

### 6.4 Adapter Usage Examples

Redis adapter:

```ts
import { EventsDomain, RedisClient, RedisEventsAdapter } from 's42-core'

const redis = RedisClient.getInstance('redis://127.0.0.1:6379')
await redis.connect()

const events = EventsDomain.getInstance(redis)
events.setAdapter(new RedisEventsAdapter(redis))
```

SQS adapter:

```ts
import { EventsDomain, SQSEventsAdapter } from 's42-core'

const events = EventsDomain.getInstance()
events.setAdapter(
  new SQSEventsAdapter({
    queueUrl: process.env.SQS_QUEUE_URL!,
    region: process.env.AWS_REGION ?? 'us-east-1',
    pollIntervalMs: 500,
    waitTimeSeconds: 10,
  }),
)
```

### 6.5 Event Contract Example

```ts
type OperatorCreatedPayload = {
  uuid: string
  email: string
  createdAt: number
}

events.registerEmitter('OPERATORS.SIGNUP.CREATED', 'OPERATORS')

events.listen(
  { eventName: 'OPERATORS.SIGNUP.CREATED', multiple: true },
  async (event) => {
    const payload = event.payload as OperatorCreatedPayload
    console.info('operator created', payload.uuid)
  },
  'NOTIFICATIONS',
)

await events.emit({
  eventName: 'OPERATORS.SIGNUP.CREATED',
  payload: { uuid: Bun.randomUUIDv7(), email: 'a@b.com', createdAt: Date.now() },
})
```

## 7. Persistence Layer

## 7.1 `Dependencies` Container

Simple static DI container.

```ts
Dependencies.add('db', mongoClient)
Dependencies.get<MongoClient>('db')
Dependencies.has('db')
Dependencies.remove('db')
Dependencies.clear()
```

Use this when storage/services need global runtime dependencies.

## 7.2 MongoDB with `MongoClient`

`MongoClient` wraps official `mongodb` driver with singleton pattern.

Connect:

```ts
import { MongoClient } from 's42-core'

const db = MongoClient.getInstance({
  connectionString: process.env.MONGO_URI!,
  database: process.env.MONGO_DB!,
})
await db.connect()
```

Core methods:
- `connect()`
- `close()`
- `getDB()`
- `getCollection<T>(name)`
- `ObjectId(id)`
- `static paginate(collection, query, fields, options)`

### 7.2.1 Pagination Response Shape

`MongoClient.paginate()` returns:

```ts
{
  docs: T[]
  count: number
  limit: number
  page: number
  totalPages: number
}
```

### 7.2.2 Example: Basic Paginated Endpoint

```ts
import { Controller, MongoClient } from 's42-core'

type OperatorDoc = {
  _id: string
  data: { email: string; first_name?: string; last_name?: string }
  _added: Date
}

export default {
  name: 'operatorsList',
  version: '1.0.0',
  method: 'GET',
  path: '/operators/list',
  handler: async (req: any, res: any) => {
    const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit ?? '20', 10) || 20))

    const db = MongoClient.getInstance({
      connectionString: process.env.MONGO_URI!,
      database: process.env.MONGO_DB!,
    })

    const result = await MongoClient.paginate<OperatorDoc>(
      db.getCollection('operators'),
      {},
      { data: 1, _added: 1 },
      { page, limit, sort: { _added: -1 } },
    )

    return res.json({ ok: true, ...result })
  },
}
```

### 7.2.3 Example: Search + Filter + Pagination

```ts
const pattern = (req.query.q ?? '').trim()
const onlyEnabled = req.query.enabled === 'true'

const query: Record<string, unknown> = {}
if (pattern) {
  query.$or = [
    { 'data.email': { $regex: pattern, $options: 'i' } },
    { 'data.first_name': { $regex: pattern, $options: 'i' } },
    { 'data.last_name': { $regex: pattern, $options: 'i' } },
  ]
}
if (onlyEnabled) {
  query['data.enabled'] = true
}

const result = await MongoClient.paginate(
  db.getCollection('operators'),
  query,
  { 'data.password': 0 },
  { page, limit, sort: { _added: -1 } },
)
```

### 7.2.4 Example: Paginated by Owner UUID

```ts
const ownerUUID = req.params.ownerUUID

const result = await MongoClient.paginate(
  db.getCollection('properties'),
  { 'data.owner_uuid': ownerUUID },
  {},
  { page, limit, sort: { 'data.monthly_rent': 1, _added: -1 } },
)

return res.json({ ok: true, ...result })
```

### 7.2.5 Example: Infinite Scroll API Contract

```ts
const result = await MongoClient.paginate(
  db.getCollection('events_audit'),
  { 'data.module': 'OPERATORS' },
  {},
  { page, limit, sort: { emittedAt: -1 } },
)

return res.json({
  ok: true,
  docs: result.docs,
  meta: {
    page: result.page,
    limit: result.limit,
    total: result.count,
    totalPages: result.totalPages,
    hasNextPage: result.page < result.totalPages,
    hasPrevPage: result.page > 1,
  },
})
```

### 7.2.6 Example: Aggregation + Pagination (Manual Facet)

```ts
const pipeline = [
  { $match: { 'data.status': 'available' } },
  { $sort: { _added: -1 } },
  {
    $facet: {
      docs: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      meta: [{ $count: 'count' }],
    },
  },
]

const [agg] = await db.getCollection('properties').aggregate(pipeline).toArray()
const count = agg?.meta?.[0]?.count ?? 0

return {
  docs: agg?.docs ?? [],
  count,
  page,
  limit,
  totalPages: Math.ceil(count / limit),
}
```

### 7.2.7 Example: `ObjectId` Helper Usage

```ts
const mongoId = db.ObjectId(req.params.id)
const one = await db.getCollection('operators').findOne({ _id: mongoId })
```

## 7.3 MongoDB with `MongoDBStorage`

`MongoDBStorage` is a base class to implement module-level repositories quickly.

Import note:
- In this repository modules use `import { MongoDBStorage } from '@/MongoDBStorage'`.
- It is an internal utility (`src/MongoDBStorage/index.ts`) and is not exported from the root `src/index.ts` entrypoint.

Key ideas:
- Uses `Dependencies.get('db')` to resolve `MongoClient`.
- Adds shared document metadata (`uuid`, `_added`, `_v`, `_n`).
- Provides static helpers for CRUD, aggregate, distinct, and paginated search.

Important methods:
- protected: `_insert`, `_insertFlat`, `getCollection`
- static: `_findOne`, `_find`, `_count`, `_getByUUID`, `_update`, `_deleteOne`, `_deleteMany`, `_delete`, `_distinct`, `_aggregate`, `_search`, `createIndex`

### 7.3.1 Real Pattern (from `modules/properties/services/index.ts`)

```ts
export default class PropertiesStorage extends MongoDBStorage {
  static readonly COLLECTION = 'properties'

  static async getAll(options?: {
    query?: string
    page?: number
    limit?: number
    sort?: Record<string, 1 | -1>
    onlyAvailable?: boolean
  }) {
    const query: Record<string, unknown> = {}

    if (options?.query) {
      const pattern = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { 'data.title': { $regex: pattern, $options: 'i' } },
        { 'data.address': { $regex: pattern, $options: 'i' } },
        { 'data.city': { $regex: pattern, $options: 'i' } },
      ]
    }

    if (options?.onlyAvailable) {
      query['data.status'] = 'available'
    }

    return MongoDBStorage._search(
      PropertiesStorage.COLLECTION,
      query,
      undefined,
      {
        page: options?.page ?? 1,
        limit: options?.limit ?? 10,
        sort: options?.sort ?? { _added: -1 },
      },
    )
  }
}
```

### 7.3.2 Paginated HTTP Controller with `MongoDBStorage._search`

```ts
export default {
  name: 'propertyList',
  version: '1.0.0',
  method: 'GET',
  path: '/properties/list',
  requireBefore: ['auth'],
  handler: async (req: any, res: any) => {
    const page = Number.parseInt(req.query.page ?? '1', 10)
    const limit = Number.parseInt(req.query.limit ?? '10', 10)
    const data = await PropertiesStorage.getAll({
      query: req.query.query,
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 10 : limit,
      onlyAvailable: req.query.available === 'true',
    })

    return res.json({
      ok: true,
      docs: data.docs,
      count: data.count,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    })
  },
}
```

This is the built-in pagination style currently used by repository modules in this codebase.

## 7.4 Redis with `RedisClient`

Features:
- Singleton connection.
- Dedicated pub/sub duplicated clients.
- Hash helpers (`hset`, `hget`, `hgetall`).
- Cache helpers (`setCache`, `getCache`).
- Counter helper (`counter`).

Example:

```ts
import { RedisClient } from 's42-core'

const redis = RedisClient.getInstance(process.env.REDIS_URL)
await redis.connect()

await redis.setCache('health', { ok: true, ts: Date.now() })
const cached = await redis.getCache<{ ok: boolean; ts: number }>('health')

redis.subscribe<{ id: string }>('OPERATORS.CREATED', payload => {
  console.info('created', payload.id)
})
redis.publish('OPERATORS.CREATED', { id: Bun.randomUUIDv7() })
```

## 7.5 SQL (`SQL` class)

Unified abstraction for:
- `postgres`
- `mysql`
- `sqlite`

Main API:
- schema: `createTable`, `addTableColumns`, `createIndex`, `dropTable`, `getAllTables`, `getTableSchema`, `validateTableSchema`
- data: `insert`, `select`, `selectPaginate`, `update`, `updateById`, `delete`, `deleteById`, `count`
- utility: `translateMongoJsonToSql`

Example:

```ts
import { SQL } from 's42-core'

const db = new SQL({ type: 'postgres', url: process.env.DB_URL })

await db.createTable('products', {
  id: 'serial primary key',
  name: 'text',
  price: 'numeric',
  enabled: 'boolean',
})

await db.insert('products', { name: 'desk', price: 120, enabled: true })

const page = await db.selectPaginate<{ id: number; name: string }>({
  tableName: 'products',
  whereClause: { enabled: true, price: { $gte: 100 } },
  sort: { id: -1 },
  page: 1,
  limit: 20,
})
```

## 7.6 SQLite (`SQLite` class)

Direct Bun SQLite utility:
- file mode (`{ type: 'file', filename: './db.sqlite' }`)
- memory mode (`{ type: 'memory' }`)

Example:

```ts
import { SQLite } from 's42-core'

const db = new SQLite({ type: 'file', filename: './ops.sqlite' })
db.createTable('operators', {
  uuid: 'text primary key',
  email: 'text',
  enabled: 'integer',
})

db.insert('operators', {
  uuid: Bun.randomUUIDv7(),
  email: 'ops@example.com',
  enabled: 1,
})

const rows = await db.select<{ uuid: string; email: string }>('operators', ['uuid', 'email'])
```

## 8. Other Framework Components

## 8.1 `SSE`

SSE helper using `ReadableStream` (`type: 'direct'`).

Example endpoint:

```ts
import { Controller, SSE } from 's42-core'

export default {
  name: 'stream',
  version: '1.0.0',
  method: 'GET',
  path: '/stream',
  handler: async (req: Request) => {
    const sse = new SSE(req)

    const timer = setInterval(() => {
      sse.send({ eventName: 'tick', eventPayload: { now: Date.now() } })
    }, 1000)

    req.signal.addEventListener('abort', () => {
      clearInterval(timer)
      sse.close()
    })

    return sse.getResponse()
  },
}
```

## 8.2 `CoreStats`

Automatic introspection endpoint exposed as `GET /core/stats` when `ENABLE_CORE_STATS=true`.

No manual bootstrap is required. It is registered automatically when you build `RouteControllers`.

```ts
import { Modules, RouteControllers, Server } from 's42-core'

const modules = new Modules('./modules')
await modules.load()

const server = new Server()
await server.start({
  port: 5678,
  RouteControllers: new RouteControllers(modules.getControllers()),
  hooks: modules.getHooks(),
})
```

Response includes:
- all exposed endpoints (`method` + `path`)
- all loaded modules (`mws`, `share`, `full`)
- system information from `free -m`, `df -h`, `uptime`, `who`, and `cpupower frequency-info`

If the env var is missing or false, the route is not injected.

## 8.3 `Cluster`

Worker orchestration with `Bun.spawn` and IPC.

Example:

```ts
import { Cluster } from 's42-core'

const cluster = new Cluster({
  name: 'api-cluster',
  maxCPU: 2,
  watchMode: false,
  args: [],
})

cluster.onWorkerMessage(message => {
  console.info('worker message:', message)
})

cluster.start('./modules/server.ts', err => {
  console.error('cluster failed:', err)
})
```

## 8.4 `sendEmail` (Mailgun)

```ts
import { sendEmail } from 's42-core/dist/Mailgun'

await sendEmail({
  domainName: process.env.MAILGUN_DOMAIN!,
  username: 'api',
  password: process.env.MAILGUN_KEY!,
  from: 'noreply@example.com',
  to: 'ops@example.com',
  subject: 'Service Alert',
  text: 'All systems operational',
  apiHost: 'api.eu.mailgun.net',
})
```

## 8.5 `ViewTemplates`

```ts
import { ViewTemplates } from 's42-core'

const html = await ViewTemplates('./views/operators.html', {
  title: 'Operators',
  users: [{ name: 'Ada' }, { name: 'Linus' }],
})
```

Supports:
- `{{key}}`
- `{{nested.key}}`
- `{{#each list}}...{{/each}}` + `{{this.field}}`

## 8.6 `Test` Helpers

`Test` namespace exports:
- `Init`
- `Ok`
- `Error`
- `Request`
- `Finish`

Use for quick script logs; use `bun:test` for real automated tests.

## 9. Complete Modular Backend Blueprint

This is the recommended architecture sequence for real projects.

### 9.1 Bootstrap

```ts
import {
  Dependencies,
  MongoClient,
  RedisClient,
  EventsDomain,
  RedisEventsAdapter,
  Modules,
  RouteControllers,
  Server,
} from 's42-core'

async function bootstrap() {
  const mongo = MongoClient.getInstance({
    connectionString: process.env.MONGO_URI!,
    database: process.env.MONGO_DB!,
  })
  await mongo.connect()
  Dependencies.add('db', mongo)

  const redis = RedisClient.getInstance(process.env.REDIS_URL)
  await redis.connect()
  Dependencies.add('redis', redis)

  const events = EventsDomain.getInstance(redis)
  events.setAdapter(new RedisEventsAdapter(redis))
  Dependencies.add('events', events)

  const modules = new Modules('./modules', events)
  await modules.load()

  const server = new Server()
  await server.start({
    port: Number(process.env.SERVER_PORT ?? 5678),
    RouteControllers: new RouteControllers(modules.getControllers()),
    hooks: modules.getHooks(),
    development: true,
  })
}

await bootstrap()
```

### 9.2 Domain Module Construction Pattern

For each domain (`operators`, `properties`, `orders`, etc):
1. Create `__module__.ts` (`type: 'full'`).
2. Add `models/` with zod schemas + methods.
3. Add `services/` extending `MongoDBStorage` or using SQL.
4. Add controllers with strict validation and standardized responses.
5. Add `events/emit.ts` and listener files for domain flows.
6. Add tests in `module/test` using `bun:test`.

### 9.3 Authentication as `mws` Module

- Keep authentication reusable in `mws`.
- Enable per endpoint with `requireBefore: ['auth']`.
- Use `requireBefore: ['mws']` only when every middleware should run.

### 9.4 Shared Logic as `share` Module

- Put cross-domain constants, DTO schemas, helpers, and adapters in `share`.
- Do not put route handlers in `share`.

## 10. LLM-Oriented Build Rules

If you are an AI model generating code for S42-Core, follow these rules:

1. Always create a `Modules` bootstrap and call `await modules.load()`.
2. Always return a `Response` from handlers and middleware.
3. Use `zod` for request validation inside controllers.
4. Keep controller thin; move data logic to service/storage classes.
5. For Mongo lists, implement `page` and `limit` query params and return pagination metadata.
6. Prefer `MongoDBStorage._search` or `MongoClient.paginate` for list endpoints.
7. Use explicit event names and explicit `EVENTS` mapping in listeners.
8. Register dependencies (`db`, `redis`, `events`) with stable keys.
9. Keep module type responsibilities strict (`mws` vs `share` vs `full`).
10. Use Bun-native APIs first.

## 11. Known Current Runtime Behaviors

These are important for accurate implementation:

- `Modules` stores `services/models/types` arrays but currently does not auto-load `services/` or `models/` directories.
- Controller field `enabled` exists in metadata but current loader does not enforce it.
- Global hooks array from `modules.getHooks()` is currently empty unless you add hooks manually elsewhere.
- Listener export names can become event names if `EVENTS` mapping is not provided.
- In controller chains, always return explicit `Response` objects to avoid ambiguous behavior.

These are not blockers, but they should shape how you design your modules.

## 12. Quick Reference Snippets

### 12.1 `mws` Module

```ts
// modules/auth/__module__.ts
export default { name: 'auth', version: '1.0.0', type: 'mws' }
```

```ts
// modules/auth/mws/index.ts
import type { Res } from '@/Response'

export default async () => {}

export const beforeRequest = async (req: Request, res: Res) => {
  return async (req: Request, res: Res, next: (req: Request, res: Res) => void) => {
    next(req, res)
  }
}

export const afterRequest = async (_req: Request, res: Res) => res
```

### 12.2 `share` Module

```ts
// modules/share/__module__.ts
export default { name: 'share', version: '1.0.0', type: 'share' }
```

### 12.3 `full` Module

```ts
// modules/operators/__module__.ts
export default { name: 'operators', version: '1.0.0', type: 'full' }
```

```ts
// modules/operators/controllers/operatorList.ts
import type { ControllerType } from '@/Modules'

export default {
  name: 'operatorList',
  version: '1.0.0',
  method: 'GET',
  path: '/operators/list',
  requireBefore: ['auth'],
  handler: async (_req: any, res: any) => res.json({ ok: true, docs: [] }),
} as ControllerType
```

### 12.4 Paginated Mongo Endpoint Template

```ts
export default {
  name: 'list',
  version: '1.0.0',
  method: 'GET',
  path: '/items/list',
  handler: async (req: any, res: any) => {
    const page = Math.max(1, Number(req.query.page ?? 1))
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)))

    const result = await MongoClient.paginate(
      Dependencies.get<MongoClient>('db')!.getCollection('items'),
      {},
      {},
      { page, limit, sort: { _added: -1 } },
    )

    return res.json({ ok: true, ...result })
  },
}
```

## 13. Final Guidance

S42-Core works best when you enforce:
- strict domain boundaries (one module per business context),
- explicit contracts (zod schemas, typed payloads, stable event names),
- predictable list APIs with pagination metadata,
- Bun-native runtime patterns.

If you follow the blueprint in this file, you can build production-ready modular backends with S42-Core in Bun + TypeScript in a consistent, scalable way.
