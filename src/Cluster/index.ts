import { spawn } from 'bun'

export class Cluster {
	private cpus = navigator.hardwareConcurrency
	private buns = new Array(this.cpus)
	private file: string = ''

	public start(file: string, fallback: (err: Error) => void) {
		try {
			console.info(`Spawning ${this.cpus} worker(s)`)

			for (let i = 0; i < this.cpus; i++) {
				this.buns[i] = spawn({
					cmd: ['bun', file],
					stdout: 'inherit',
					stderr: 'inherit',
					stdin: 'inherit',
				})
			}

			process.on('SIGINT', this.killWorkers.bind(this))
			process.on('exit', this.killWorkers.bind(this))
		} catch (unknownError) {
			const error =
				unknownError instanceof Error ? unknownError : new Error(String(unknownError))

			fallback(new Error(`Cluster setup failed: ${error.message}`))
		}
	}

	private killWorkers() {
		console.info('Shutting down workers...')
		for (const bun of this.buns) {
			bun.kill()
		}
	}
}
