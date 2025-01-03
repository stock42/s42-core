- [Dependencies Class Documentation](#dependencies-class-documentation)
	- [Features](#features)
	- [API Documentation](#api-documentation)
		- [Methods](#methods)
			- [`add<DEP>(name: string, dep: DEP): void`](#adddepname-string-dep-dep-void)
			- [`get<DEP>(name: string): DEP | null`](#getdepname-string-dep--null)
			- [`remove(name: string): boolean`](#removename-string-boolean)
			- [`clear(): void`](#clear-void)
			- [`has(name: string): boolean`](#hasname-string-boolean)
	- [Example Usage](#example-usage)
		- [Registering and Retrieving Dependencies](#registering-and-retrieving-dependencies)
		- [Removing and Clearing Dependencies](#removing-and-clearing-dependencies)
	- [Use Cases](#use-cases)
	- [Error Handling](#error-handling)
	- [License](#license)


# Dependencies Class Documentation

The `Dependencies` class is a utility designed to manage dependencies in a centralized and controlled manner. It allows you to register, retrieve, and remove dependencies by name, making it ideal for modular applications.

---

## Features

- **Centralized Dependency Management:** Register and retrieve dependencies globally.
- **Type Safety:** Supports TypeScript generics for type-safe dependency management.
- **Error Handling:** Prevents duplicate dependency registration.

---

## API Documentation

### Methods

#### `add<DEP>(name: string, dep: DEP): void`

Registers a new dependency with a unique name.

- **Parameters:**
  - `name` *(string)*: The unique name of the dependency.
  - `dep` *(any)*: The dependency instance or object to register.
- **Throws:**
  - An error if a dependency with the same name already exists.

#### `get<DEP>(name: string): DEP | null`

Retrieves a registered dependency by its name.

- **Parameters:**
  - `name` *(string)*: The name of the dependency to retrieve.
- **Returns:**
  - The instance of the dependency if found, or `null` if it does not exist.

#### `remove(name: string): boolean`

Removes a registered dependency by its name.

- **Parameters:**
  - `name` *(string)*: The name of the dependency to remove.
- **Returns:**
  - `true` if the dependency was successfully removed, `false` if it did not exist.

#### `clear(): void`

Clears all registered dependencies.

#### `has(name: string): boolean`

Checks if a dependency with the specified name exists.

- **Parameters:**
  - `name` *(string)*: The name of the dependency to check.
- **Returns:**
  - `true` if the dependency exists, `false` otherwise.

---

## Example Usage

### Registering and Retrieving Dependencies

```typescript
import { Dependencies } from 's42-core';

// Register a dependency
Dependencies.add('database', { connectionString: 'mongodb://localhost:27017' });

// Check if the dependency exists
if (Dependencies.has('database')) {
  console.log('Database dependency exists.');
}

// Retrieve the dependency
const dbConfig = Dependencies.get<{ connectionString: string }>('database');
console.log('Connection String:', dbConfig?.connectionString);
```

### Removing and Clearing Dependencies

```typescript
// Remove a specific dependency
Dependencies.remove('database');

// Clear all dependencies
Dependencies.clear();
```

---

## Use Cases

- **Service Management:** Store shared services such as database instances, HTTP clients, or configurations.
- **Dependency Injection:** Simplify dependency injection across different parts of the application.
- **Unit Testing:** Mock dependencies for isolated testing scenarios.

---

## Error Handling

The `add` method will throw an error if you attempt to register a dependency with a name that already exists. Ensure that names are unique within your application:

```typescript
try {
  Dependencies.add('database', {});
  Dependencies.add('database', {}); // Throws an error
} catch (error) {
  console.error(error.message);
}
```

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

