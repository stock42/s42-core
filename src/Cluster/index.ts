import { cpus } from 'node:os'
import { randomUUID } from 'node:crypto'

import cluster from 'node:cluster'

export function Cluster(
	cores: number = 0,
	childCallback: (pid: number, uuid: string) => void,
	fallback: (err: Error) => void,
) {
	try {
		if (cluster.isPrimary) {
			const numCPUs = cores === 0 ? cpus().length : cores
			console.info(`Primary ${process.pid} is running`)

			for (let i = 0; i < numCPUs; i += 1) {
				cluster.fork()
			}

			cluster.on('exit', (worker, code, signal) => {
				console.info(`Worker ${worker.process.pid} died: ${code} - ${signal}`)
			})
		} else {
			childCallback(process.pid, randomUUID())
		}
	} catch (err) {
		fallback(new Error(String(err)))
	}
}
