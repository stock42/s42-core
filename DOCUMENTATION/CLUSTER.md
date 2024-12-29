# Cluster Class Documentation

The `Cluster` class is a powerful utility provided by `s42-core` that simplifies the creation and management of worker processes in applications. It supports clustering, inter-process communication, and graceful worker shutdown.

---

## Features

- **Cluster Management:** Easily spawn and manage multiple worker processes.
- **Inter-process Communication (IPC):** Send and receive messages between the master process and worker processes.
- **Graceful Shutdown:** Automatically handles cleanup of workers on process termination.

---

## Installation

Install the `s42-core` package using `bun`:

```bash
bun add s42-core
```

---

## Example Usage

### Basic Example

```typescript
import { Cluster } from 's42-core';

const s42Cluster = new Cluster({
  name: 'filestorage',
  maxCPU: 1, // Limits the number of worker processes
});

s42Cluster.start('./src/index.ts', (err: Error) => {
  if (err) {
    console.info('Error starting cluster:', err);
    process.exit(1);
  }
});

s42Cluster.onWorkerMessage(async (message: string) => {
  console.info('Message from worker:', message);
});
```

---

## API Documentation

### Constructor

#### `new Cluster(props: TypeConstructor)`

Creates a new instance of the `Cluster` class.

- **Parameters:**
  - `props.name` *(string)*: A unique name for the cluster.
  - `props.maxCPU` *(number, optional)*: The maximum number of worker processes. Defaults to the number of CPUs.

### Methods

#### `start(file: string, fallback: (err: Error) => void): void`

Starts the worker processes.

- **Parameters:**
  - `file` *(string)*: Path to the worker file to execute.
  - `fallback` *(function)*: A callback function executed if the cluster fails to start.

#### `onWorkerMessage(callback: (message: string) => void): void`

Registers a callback function to handle messages from workers.

- **Parameters:**
  - `callback` *(function)*: Function executed when a worker sends a message.

#### `sendMessageToWorkers(message: string): void`

Sends a message to all worker processes.

- **Parameters:**
  - `message` *(string)*: The message to broadcast to workers.

#### `getCurrentFile(): string`

Returns the file currently executed by the workers.

- **Returns:**
  - *(string)*: The path of the worker file.

#### `getCurrentWorkers(): Array<BunChildProcess>`

Retrieves the array of active worker processes.

- **Returns:**
  - *(Array<BunChildProcess>)*: List of worker processes.

---

## Events

### Process Signals

The `Cluster` class listens to the following signals for cleanup:
- `SIGINT`
- `exit`

Workers are gracefully terminated when these signals are received.

---

## Error Handling

Ensure to provide a `fallback` function in the `start` method to handle errors during cluster initialization.

```typescript
s42Cluster.start('./src/index.ts', (err: Error) => {
  if (err) {
    console.error('Cluster failed to start:', err);
  }
});
```

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

