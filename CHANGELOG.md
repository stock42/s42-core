# Changelog

All notable changes to this project will be documented in this file.

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
