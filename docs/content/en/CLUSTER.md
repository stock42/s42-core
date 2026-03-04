# CLUSTER

## Purpose

`Cluster` manages Bun workers using `Bun.spawn` and IPC messaging.
It is intended for running the same service in multiple worker processes.

## Constructor

```ts
const cluster = new Cluster({
  name: 'api',
  maxCPU: 4,
  watchMode: false,
  args: [],
})
```

## Features

- Uses `process.execPath` to spawn the current Bun runtime.
- Supports `--watch` mode when enabled.
- Broadcast command/message delivery to all workers.
- Worker message callback registration (`onWorkerMessage`).
- Graceful shutdown trigger on `SIGINT` / `SIGTERM`.

## Public API

- `start(file, fallback)`
- `onWorkerMessage(callback)`
- `sendMessageToWorkers(message)`
- `getCurrentFile()`
- `getCurrentWorkers()`

## IPC contract

Cluster sends JSON commands to workers:

- `start`
- `setName`
- `sendMessageToCluster`

Workers can send broadcast payloads to cluster using the `>>.<<|` prefix.

## Example

```ts
import { Cluster } from 's42-core'

const cluster = new Cluster({ name: 's42-api', maxCPU: 2 })
cluster.onWorkerMessage((msg) => console.info('worker:', msg))
cluster.start('./modules/server.ts', (err) => {
  console.error('cluster failed', err)
})
```

## Notes

- Keep worker bootstrap idempotent.
- Avoid long blocking tasks in worker startup path.
- Integrate health checks/load balancer on top for production HA.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
