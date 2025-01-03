- [Cluster Documentation](#cluster-documentation)
	- [Purpose](#purpose)
	- [Installation](#installation)
	- [Usage](#usage)
		- [Basic Example](#basic-example)
	- [Constructor](#constructor)
	- [Key Methods](#key-methods)
		- [`start(file: string, fallback: (err: Error) => void): void`](#startfile-string-fallback-err-error--void-void)
		- [`onWorkerMessage(callback: (message: string) => void): void`](#onworkermessagecallback-message-string--void-void)
		- [`sendMessageToWorkers(message: string): void`](#sendmessagetoworkersmessage-string-void)
		- [`getCurrentFile(): string`](#getcurrentfile-string)
		- [`getCurrentWorkers(): Array<ReturnType<typeof spawn>>`](#getcurrentworkers-arrayreturntypetypeof-spawn)
		- [`killWorkers(): void`](#killworkers-void)
	- [Features](#features)
	- [Full Example](#full-example)
	- [Advantages](#advantages)
	- [License](#license)



# Cluster Documentation

The `Cluster` class is part of the `s42-core` package and enables the creation and management of parallel processes using Bun workers. It simplifies task distribution in applications that need to utilize multiple CPUs or manage independent processes.

---

## Purpose

The `Cluster` class:

- Creates and manages multiple workers efficiently.
- Supports bidirectional messaging between the main process and workers.
- Includes support for automatic worker restarts in development mode (`--watch`).
- Handles errors and provides a simple API for integration.

---

## Installation

Install the `s42-core` package:

```bash
npm install s42-core
```

---

## Usage

### Basic Example

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 4,
  watchMode: true, // Enables automatic worker restarts in development mode
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});
```

---

## Constructor

```typescript
constructor(props: TypeConstructor & { watchMode?: boolean });
```

- **`props.name`** *(string)*: Name of the cluster.
- **`props.maxCPU`** *(number)*: Maximum number of CPUs to use.
- **`props.watchMode`** *(boolean, optional)*: Enables automatic worker restarts in development mode (`--watch`).

---

## Key Methods

### `start(file: string, fallback: (err: Error) => void): void`

Starts the cluster and spawns workers.

- **`file`** *(string)*: File to be executed by the workers.
- **`fallback`** *(function)*: Callback executed if an error occurs while starting the cluster.

```typescript
cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});
```

### `onWorkerMessage(callback: (message: string) => void): void`

Registers a callback to handle messages sent by the workers to the main process.

```typescript
cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});
```

### `sendMessageToWorkers(message: string): void`

Sends a message to all active workers.

```typescript
cluster.sendMessageToWorkers('Hello Workers!');
```

### `getCurrentFile(): string`

Returns the file currently executed by the workers.

```typescript
console.info('Current file:', cluster.getCurrentFile());
```

### `getCurrentWorkers(): Array<ReturnType<typeof spawn>>`

Returns a list of active workers.

```typescript
console.info('Active workers:', cluster.getCurrentWorkers());
```

### `killWorkers(): void`

Safely shuts down all active workers.

```typescript
process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Features

1. **Parallelism**: Utilizes all available CPUs or a specified number of them.
2. **Messaging**: Supports bidirectional messaging between the main process and workers.
3. **Development Mode**: Automatic worker restarts with the `--watch` option.
4. **Error Handling**: Provides callbacks to handle initialization errors.
5. **Simple Integration**: Designed for easy integration into applications.

---

## Full Example

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 2,
  watchMode: true,
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});

cluster.sendMessageToWorkers('Hello Workers!');

process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Advantages

- **Modularity**: Designed to handle parallel processes easily.
- **Efficiency**: Maximizes system resource utilization.
- **Flexibility**: Configurable for different environments (development/production).
- **Simplicity**: Intuitive and well-documented API.

---

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

