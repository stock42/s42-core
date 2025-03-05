import { serve, sleep, type Server as ServerBun} from 'bun'
import { type RouteControllers } from '../RouteControllers'

import { type TypeHook } from './types.ts'
import { type TypeCommandToWorkers } from '../Cluster/types.ts'

export type TypeServerConstructor = {
	port: number
	clustering?: boolean
	idleTimeout?: number
	maxRequestBodySize?: number
	error?: (err: Error) => Response
	hooks?: TypeHook[]
	RouteControllers?: RouteControllers
	development?: boolean,
	awaitForCluster?: boolean,
}

export class Server {
	private startedFromCluster: boolean = false
	private clusterName: string = ''
	private server: ServerBun | undefined
	private callbackMessageFromWorkers: Array<(message: string) => void> = []

	constructor() {
		process.on('message', (message: string) => {
			try {
				const cmd = JSON.parse(message) as TypeCommandToWorkers
				if (cmd.command === 'start') {
					this.startedFromCluster = true
				}
				if (cmd.command === 'setName') {
					this.clusterName = cmd.message
				}
				if (cmd.command === 'sendMessageToCluster') {
					for (const callback of this.callbackMessageFromWorkers) {
						callback(cmd.message)
					}
				}
			} catch (error) {

			}
		})
	}

	public async start(properties: TypeServerConstructor) {
		const {
			port = 0,
			clustering = false,
			idleTimeout = 300,
			maxRequestBodySize = 1000000,
			error,
			hooks = [],
			RouteControllers,
			development = false,
			awaitForCluster = false,
		} = properties

		console.info('🚀 Starting server on port:', port)
		const callback =
			RouteControllers ?
				RouteControllers.getCallback()
			:	async (req: Request) => {
					return new Response(`Not Found ${new URL(req.url).pathname}`, { status: 404 })
				}



		this.server = serve({
			port,
			reusePort: clustering,
			idleTimeout,
			maxRequestBodySize,
			development,
			error(err) {
				if (error) {
					return error(err)
				}
				return new Response(`<pre>${error}\n${err.stack}</pre>`, {
					headers: {
						'Content-Type': 'text/html',
					},
				})
			},
			async fetch(request, server) {
				const ip = server.requestIP(request)
				const url = new URL(request.url).pathname
				return callback(request)
			},
		})

		while (awaitForCluster && !this.startedFromCluster) {
			await sleep(1000)
		}
	}

	public getPort() {
		return this.server?.port
	}

	public getURL() {
		return this.server?.url.href
	}

	public isStartedFromCluster() {
		return this.startedFromCluster
	}

	public getClusterName() {
		return this.clusterName
	}

	public sendMessageToCluster(message: string) {
		process.send(message)
	}

	public sendMessageToWorkers(message: string) {
		process.send(`>>.<<|${message}`)
	}

	public onMessageFromWorkers(callback: (message: string) => void) {
		this.callbackMessageFromWorkers.push(callback)
	}
}
