import { spawn } from 'bun'

import { type TypeConstructor, type TypeCommandToWorkers } from './types.ts'

export class Cluster {
	private readonly cpus = navigator.hardwareConcurrency
	private buns: Array<ReturnType<typeof spawn>> = []
	private file: string = ''
	private name: string = 'noname'
	private maxCPU: number = 0
	private callbackOnWorkerMessage: Array<(message: string) => void> = []
	private watchMode: boolean = false
	private args: string[] = [] // Nueva propiedad para los argumentos
	private shuttingDown: boolean = false

	private readonly handleSigint = (): void => {
		void this.killWorkers('SIGINT')
	}

	private readonly handleSigterm = (): void => {
		void this.killWorkers('SIGTERM')
	}

	constructor(props: TypeConstructor & { watchMode?: boolean; args?: string[] }) {
		this.name = props.name
		this.maxCPU = props.maxCPU && props.maxCPU < this.cpus ? props.maxCPU : this.cpus
		this.buns = new Array(this.maxCPU)
		this.watchMode = props.watchMode ?? false
		this.args = props.args ?? [] // Inicializa la propiedad `args` con los argumentos pasados
	}

	public onWorkerMessage(callback: (message: string) => void): void {
		this.callbackOnWorkerMessage.push(callback)
	}

	public start(file: string, fallback: (err: Error) => void): void {
		if (this.buns.length > 0 && this.buns.some(bun => bun?.pid)) {
			console.warn('Workers are already running.')
			return
		}

		try {
			this.file = file
			console.info(`Spawning ${this.maxCPU} worker(s) for ${this.name}`)

			// Use current Bun executable to avoid env/path inconsistencies across hosts.
			const cmd = [
				process.execPath,
				...this.args,
				...(this.watchMode ? ['--watch'] : []),
				file,
			]

			for (let i = 0; i < this.maxCPU; i++) {
				this.buns[i] = spawn({
					cmd,
					stdout: 'inherit',
					stderr: 'inherit',
					stdin: 'inherit',
					onExit(code) {
						console.info(`Worker exited with code ${code}`)
					},
					ipc: (message, childProc) => {
						this.handleWorkerMessage(message, childProc)
					},
				})
			}

			process.off('SIGINT', this.handleSigint)
			process.off('SIGTERM', this.handleSigterm)
			process.once('SIGINT', this.handleSigint)
			process.once('SIGTERM', this.handleSigterm)

			this.sendCommandToWorkers({ command: 'start', message: this.file })
			this.sendCommandToWorkers({ command: 'setName', message: this.name })
		} catch (unknownError) {
			const error =
				unknownError instanceof Error ? unknownError : new Error(String(unknownError))
			fallback(new Error(`Cluster setup failed: ${error.message}`))
		}
	}

	private sendCommandToWorkers(command: TypeCommandToWorkers): void {
		if (!this.buns.length) {
			console.warn('No active workers to send the command.')
			return
		}

		for (const bun of this.buns) {
			bun.send(
				JSON.stringify({
					...command,
					ack: Bun.randomUUIDv7(),
				}),
			)
		}
	}

	public sendMessageToWorkers(message: string): void {
		if (!this.buns.length) {
			console.warn('No active workers to send the message.')
			return
		}

		for (const bun of this.buns) {
			bun.send(message)
		}
	}

	public getCurrentFile(): string {
		return this.file
	}

	public getCurrentWorkers(): Array<ReturnType<typeof spawn>> {
		return this.buns
	}

	private async killWorkers(reason = 'shutdown'): Promise<void> {
		if (this.shuttingDown) {
			return
		}

		this.shuttingDown = true
		console.info(`Shutting down ${this.name} workers (${reason})...`)

		for (const bun of this.buns) {
			if (bun?.pid) {
				console.info(`Killing worker ${bun.pid}`)
				try {
					bun.kill()
				} catch (error) {
					console.error(`Error killing worker ${bun.pid}:`, error)
				}
			}
		}

		this.buns = new Array(this.maxCPU)
		process.off('SIGINT', this.handleSigint)
		process.off('SIGTERM', this.handleSigterm)
		this.shuttingDown = false
		console.info('All workers have been terminated.')
	}

	private handleWorkerMessage(
		message: string,
		childProc: ReturnType<typeof spawn>,
	): void {
		if (message.startsWith('>>.<<|')) {
			this.sendCommandToWorkers({
				command: 'sendMessageToCluster',
				message: message.replace('>>.<<|', ''),
			})
		} else {
			for (const callback of this.callbackOnWorkerMessage) {
				callback(message)
			}
		}
	}
}
