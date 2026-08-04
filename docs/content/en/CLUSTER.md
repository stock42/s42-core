# CLUSTER

## Purpose

`Cluster` starts multiple Bun worker processes with `Bun.spawn` and connects
them through IPC.

## Constructor

```ts
import { Cluster } from 's42-core'

const cluster = new Cluster({
	name: 'api',
	maxCPU: 4,
	watchMode: false,
	args: [],
})
```

- `name: string`
- `maxCPU?: number` (capped at `navigator.hardwareConcurrency`)
- `watchMode?: boolean`
- `args?: string[]` (inserted as Bun arguments before `--watch` and the file)

Pass a positive integer for `maxCPU`. An omitted or falsy `0` value selects all
available CPUs; the constructor does not validate negative, fractional, or
non-finite values before using them as an array length.

## API

- `start(file, fallback): void`
- `onWorkerMessage(callback): void`
- `sendMessageToWorkers(message): void`
- `getCurrentFile(): string`
- `getCurrentWorkers(): Array<Subprocess>`

`start()` avoids spawning a second set while tracked workers still have PIDs.
The fallback receives synchronous setup errors.

## IPC contract

The parent sends JSON commands:

- `start`
- `setName`
- `sendMessageToCluster`

A worker can ask the parent to broadcast to all workers by sending a string with
the `>>.<<|` prefix. Other worker messages are delivered to callbacks registered
through `onWorkerMessage()`.

The worker-side helpers live on `Server`.

## Example

```ts
const cluster = new Cluster({ name: 's42-api', maxCPU: 2 })

cluster.onWorkerMessage(message => {
	console.info('worker:', message)
})

cluster.start('./modules/server.ts', error => {
	console.error('cluster setup failed', error)
})
```

The worker server must set `clustering: true` so Bun enables `reusePort`.

## Shutdown and current limits

The parent installs one-time `SIGINT` and `SIGTERM` handlers and kills all
tracked workers when either signal arrives.

Current limits:

- no public `stop()` method;
- no automatic restart after worker exit;
- no readiness or health coordination;
- no rolling restart;
- worker stdout/stderr/stdin inherit the parent.
- broadcasts check only that the tracked worker array exists; they do not
  filter exited workers or catch `Subprocess.send()` failures.

Add external supervision, readiness checks, and a load-balancer policy for
production high availability.
