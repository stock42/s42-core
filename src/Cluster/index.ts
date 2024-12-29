import { spawn } from 'bun'
import { randomUUID } from 'crypto'

import { type TypeConstructor, type TypeCommandToWorkers } from './types.ts'

export class Cluster {
	private cpus = navigator.hardwareConcurrency
	private buns
	private file: string = ''
	private name: string = 'noname'
	private maxCPU: number = 0
	private callbackOnWorkerMessage: Array<(message: string) => void> = []

	constructor(props: TypeConstructor) {
		this.name = props.name
		this.maxCPU = props.maxCPU && props.maxCPU < this.cpus ? props.maxCPU : this.cpus
		this.buns = new Array(this.maxCPU)
	}

	public onWorkerMessage(callback: (message: string) => void) {
		this.callbackOnWorkerMessage.push(callback)
	}

	public start(file: string, fallback: (err: Error) => void) {
		try {
			this.file = file
			console.info(`Spawning ${this.maxCPU} worker(s) for ${this.name}`)

			const _this = this
			for (let i = 0; i < this.maxCPU; i++) {
				this.buns[i] = spawn({
					cmd: ['bun', file],
					stdout: 'inherit',
					stderr: 'inherit',
					stdin: 'inherit',
					onExit(code) {
						console.info(`Worker exited with code ${code}`)
					},
					ipc(message, childProc) {
						for (const callback of _this.callbackOnWorkerMessage) {
							callback(message)
						}
					}
				})
			}

			process.on('SIGINT', this.killWorkers.bind(this))
			process.on('exit', this.killWorkers.bind(this))
			this.sendCommandToWorkers({
				command: 'start',
				message: this.file,
			})

			this.sendCommandToWorkers({
				command: 'setName',
				message: this.name,
			})


		} catch (unknownError) {
			const error =
				unknownError instanceof Error ? unknownError : new Error(String(unknownError))

			fallback(new Error(`Cluster setup failed: ${error.message}`))
		}
	}

	private sendCommandToWorkers(command: TypeCommandToWorkers) {
		for (const bun of this.buns) {
			bun.send(JSON.stringify({
				...command,
				ack: randomUUID(),
			}))
		}
	}

	sendMessageToWorkers(message: string) {
		for (const bun of this.buns) {
			bun.send(message)
		}
	}


	getCurrentFile() {
		return this.file
	}

	getCurrentWorkers() {
		return this.buns
	}

	private killWorkers() {
		console.info(`Shutting down ${this.name} workers...`)
		for (const bun of this.buns) {
			console.info(`Killing worker ${bun.pid}`)
			bun.kill()
		}
		console.info('All workers have been killed')
		process.exit(0)
	}
}
