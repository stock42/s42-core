# CLUSTER

## Proposito

`Cluster` administra workers Bun usando `Bun.spawn` y mensajeria IPC.
Se usa para correr el mismo servicio en multiples procesos.

## Constructor

```ts
const cluster = new Cluster({
  name: 'api',
  maxCPU: 4,
  watchMode: false,
  args: [],
})
```

## Capacidades

- Usa `process.execPath` para lanzar el runtime Bun actual.
- Soporta modo `--watch` cuando se habilita.
- Envio de comandos/mensajes en broadcast a workers.
- Registro de callbacks para mensajes de workers (`onWorkerMessage`).
- Disparo de cierre por `SIGINT` / `SIGTERM`.

## API publica

- `start(file, fallback)`
- `onWorkerMessage(callback)`
- `sendMessageToWorkers(message)`
- `getCurrentFile()`
- `getCurrentWorkers()`

## Contrato IPC

El cluster envia comandos JSON a workers:

- `start`
- `setName`
- `sendMessageToCluster`

Los workers pueden enviar payloads broadcast al cluster usando el prefijo `>>.<<|`.

## Ejemplo

```ts
import { Cluster } from 's42-core'

const cluster = new Cluster({ name: 's42-api', maxCPU: 2 })
cluster.onWorkerMessage((msg) => console.info('worker:', msg))
cluster.start('./modules/server.ts', (err) => {
  console.error('cluster failed', err)
})
```

## Notas

- Mantener el bootstrap del worker idempotente.
- Evitar tareas bloqueantes largas al iniciar workers.
- Integrar health checks/load balancer para HA en produccion.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
