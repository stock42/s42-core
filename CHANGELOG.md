# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **LICENSE:** added the MIT license file (already declared in `package.json` and listed in
  `files`, but previously missing from the repo/package).

### Removed
- **Dependency:** removed the unused `jsonwebtoken` dependency (not referenced anywhere in
  `src/`).
- **SSE:** removed the dead, unused private `sendSSECustom` method; documented the 1s flush
  cadence as the keep-alive heartbeat.

### Fixed
- **RouteControllers — query parsing:** `getQueryParams` no longer truncates query string
  values that contain `=` (e.g. base64 / JWT). Decoding semantics are unchanged. Added tests
  (`src/RouteControllers/index.test.ts`).
- **EventsDomain — evict dead instances:** listener instances now carry a `lastSeen` timestamp
  refreshed by the 5s heartbeat; instances silent for more than 3 heartbeats (15s) are purged
  from the registry, and `firstListener` is re-selected so single-listener events are no longer
  routed to a crashed instance. The local instance is never evicted. Added tests
  (`src/EventsDomain/index.test.ts`).

### Changed
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
