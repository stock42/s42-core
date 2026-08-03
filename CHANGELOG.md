# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **SQL transactions and raw execution:** `SQL` now wraps Bun's `begin`/`transaction`,
  savepoints, and distributed transaction lifecycle (`beginDistributed`/`distributed`,
  `commitDistributed`, `rollbackDistributed`). Transaction callbacks receive a scoped
  S42-Core `SQL` instance, so existing CRUD methods stay on the transaction connection.
  Added `executeRaw<T>(query, params?)` as an explicit trusted-query bypass over
  `Bun.SQL.unsafe()`.
- **SQL connection lifecycle:** added `connect()` for explicit fail-fast startup,
  `ping()` for a real `SELECT 1` health check, and Bun-compatible `close({ timeout })`
  plus its `end()` alias. Lifecycle errors use `SQLError`; transaction-scoped clients
  reject lifecycle calls so they cannot close their reserved connection.
- **SQL schema operations:** added `alterTable`, `dropColumn`, and `dropIndex`, and
  expanded `createIndex` without breaking its original two-argument form. Indexes can
  now be compound, ordered, unique, named and partial, with adapter-aware existence
  guards, PostgreSQL `concurrently`/`include`, and PostgreSQL/MySQL `using` options.
- **SQL WHERE grammar:** `SQL` and direct `SQLite` filters now support recursive
  `$and`, `$or`, and `$not` groups plus inclusive `$between`. Nested identifiers
  remain validated and every comparison value remains bound. Engine-specific
  expressions and `$ilike` remain available through `SQL.executeRaw()` rather than
  the portable filter grammar.
- **Normalized SQL errors:** added public `SQLError`, `SQLErrorCode`, `SQLDialect`,
  and `isSQLError()` exports. The multi-engine `SQL` class and direct `SQLite`
  wrapper now map the most important constraint, concurrency, and connection
  failures to stable categories with an `unknown` fallback while preserving the
  original driver `message`, `code`, `errno`, SQLSTATE, constraint, and `cause`.
  Validation and transaction-callback errors remain unchanged; query text and
  bound parameters are not attached to errors.
- **LICENSE:** added the MIT license file (already declared in `package.json` and listed in
  `files`, but previously missing from the repo/package).
- **Leveled logger:** new injectable `logger` (exported from the package) replaces raw
  `console.*` across the framework. Defaults to `debug` (everything on — no behavior change);
  set `S42_LOG_LEVEL`/`LOG_LEVEL` or call `setLogLevel(...)` to control verbosity, and
  `setLogSink(...)` to redirect output. See `DOCUMENTATION/LOGGER.md`.

### Tooling

- **ESLint 9 flat config:** migrated `.eslintrc.cjs` to `eslint.config.js` so `bun run lint`
  works again (ESLint 9 no longer reads the legacy config). Applied the existing rules and
  fixed all resulting findings (prettier formatting, dead vars, useless try/catch, `this`
  aliasing in SSE); `bun run lint` now passes clean.

### Removed

- **Dependency:** removed the unused `jsonwebtoken` dependency (not referenced anywhere in
  `src/`).
- **SSE:** removed the dead, unused private `sendSSECustom` method; documented the 1s flush
  cadence as the keep-alive heartbeat.

### Fixed

- **SQL / SQLite — null and filter safety:** direct null and `$eq: null` now emit
  `IS NULL`, while `$ne: null` emits `IS NOT NULL`. Empty `$in`/`$nin` arrays and
  null-containing membership arrays now have deterministic cross-adapter semantics.
  Invalid operands, empty operator/logical objects, and `undefined` throw instead of
  silently dropping predicates; `Date` and typed-array values are treated as scalar
  bindings. Added translator and integration coverage for both Bun SQL APIs.
- **RouteControllers — query parsing:** `getQueryParams` no longer truncates query string
  values that contain `=` (e.g. base64 / JWT). Decoding semantics are unchanged. Added tests
  (`src/RouteControllers/index.test.ts`).
- **EventsDomain — evict dead instances:** listener instances now carry a `lastSeen` timestamp
  refreshed by the 5s heartbeat; instances silent for more than 3 heartbeats (15s) are purged
  from the registry, and `firstListener` is re-selected so single-listener events are no longer
  routed to a crashed instance. The local instance is never evicted. Added tests
  (`src/EventsDomain/index.test.ts`).

### Changed

- **SQL transaction guidance:** documented the boundary between atomicity,
  concurrency control, and retry idempotency. Added a guarded single-use update
  example, affected-row validation, database-constraint defense, scoped-client
  requirements, and guidance for row locks and external side effects.
- **SQL — unified Bun driver:** the multi-engine `SQL` class now uses the promise-based
  `Bun.SQL` client for SQLite as well as PostgreSQL/MySQL, enabling one asynchronous
  transaction contract across all three adapters. The separate direct `SQLite` class
  continues to use synchronous `bun:sqlite`; SQLite WAL initialization remains enabled.
  Added public index/transaction types, focused SQLite transaction/schema/raw tests, and
  complete EN/ES component and website documentation.
- **SQL — fewer `any`:** typed the result/row access in `count`, `getAllTables` and
  `getTableSchema` (`Record<string, unknown>` rows instead of `(row: any)` + `as any`). The
  remaining generic query-result bridge and `Bun.serve` casts are documented in code.
- **SQL — reliable write return values:** `insert`, `update` and `delete` now normalize the
  heterogeneous driver results (sqlite / Postgres / MySQL) through `src/SQL/results.ts` instead
  of per-branch `as any` guesses. `insert` returns `{ lastInsertRowId?, changes, affectedRows }`
  (`changes`/`affectedRows` carry the same count); `update`/`delete` return the affected-row
  count. Added per-driver-shape unit tests (`src/SQL/results.test.ts`).

### Security

- **SQL / SQLite — identifier hardening:** SQL identifiers (table, column and `WHERE` field
  names, plus `sort` keys) are now validated against a strict allow-list before being
  interpolated into queries, closing SQL-injection vectors through identifiers. Values were
  already parameterized. Centralized in `src/SQL/identifiers.ts` and shared by both classes;
  the duplicated `translateMongoJsonToSql` was deduplicated.
  - Backwards compatibility: **validate-only** — for any already-valid identifier the generated
    SQL is byte-identical. Breaking only for callers passing raw expressions/aliases in
    `columns` (e.g. `COUNT(*) AS total`); pass plain column names or `*`.
  - `SQL.getTableSchema` (Postgres) no longer interpolates the table name as a string literal;
    it is passed as a bound parameter.
  - Added tests: `src/SQL/identifiers.test.ts` and `src/SQL/index.test.ts`.

## [3.0.0] – [3.0.6]

> Consolidated from git history (the `3.x` line shipped without per-release notes).

### Added

- **Module-oriented v3:** the framework became 100% module-oriented — modules are discovered
  by convention (`__module__.ts`) and bundle controllers, events and lifecycle. Module types
  `full` / `mws` / `share`, `enabled` flag, and `initialize` lifecycle hooks.
- **CoreStats:** optional `/core/stats` endpoint (enabled via `ENABLE_CORE_STATS`) reporting
  controllers, modules and system metrics.
- **TLS support** for SQL connections.
- **SQS events adapter** alongside the Redis adapter for `EventsDomain`.
- Event object exposed in the handler/controller scope.
- LLM-oriented documentation (`DOCUMENTATION/ALL_EN.md`).

### Fixed

- Multiple P0 runtime and typing fixes across server / modules / storage.

## [2.0.10] - 2025-11-20

### Added

- **SQL Abstraction Layer**: Introduced a new `SQL` class to handle database interactions for PostgreSQL, MySQL, and SQLite with a unified API.
  - Supports connection management.
  - Provides `createTable`, `insert`, `select`, `updateById`, `deleteById`, and `selectPaginate` methods.
  - Includes schema definition capabilities.
- **Product Management Example**: Added a comprehensive example of a Product Management API (ABM) in `example/products/index.ts` demonstrating CRUD operations and pagination using the new `SQL` class.
- **Documentation**: Updated `README.md` and `README.es.md` with details about the new SQL features and the Product Management API example.

### Changed

- Updated `package.json` version to `2.0.10`.

## [2.0.11] - 2025-11-21

### Fixed

- Remove added column from insert method

## [2.0.12] - 2025-11-25

### Added

- **SQL**: Added `count` method to `SQL` class to count rows in a table with optional filtering.

## [2.0.13] - 2025-12-30

### Added

- **RouteControllers**: Documented `formData()` helper for `multipart/form-data` and `application/x-www-form-urlencoded` requests.
- **Examples**: Added `example/s3.ts` showcasing Bun's native S3 client usage with S42core.

### Changed

- **RouteControllers**: Parse `formData()` only for form payloads to avoid consuming JSON bodies.
- **Examples**: Updated `example/index.ts` to serialize form data for JSON responses.
