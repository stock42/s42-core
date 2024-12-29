import { serve } from 'bun'
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
}

export class Server {
	private statedFromServer: boolean = false
	private clusterName: string = ''

	constructor(properties: TypeServerConstructor) {
		const {
			port = 8080,
			clustering = false,
			idleTimeout = 300,
			maxRequestBodySize = 1000000,
			error,
			hooks = [],
			RouteControllers,
		} = properties

		console.info('🚀 Starting server on port:', port)
		const callback =
			RouteControllers ?
				RouteControllers.getCallback()
			:	async (req: Request) => {
					return new Response(`Not Found ${new URL(req.url).pathname}`, { status: 404 })
				}

		process.on('message', (message: TypeCommandToWorkers) => {
			console.info('Received message from cluster:', message)
			if (message.command === 'start') {
				this.statedFromServer = true
			}
			if (message.command === 'setName') {
				this.clusterName = message.message
			}
		})

		serve({
			port,
			reusePort: clustering,
			idleTimeout,
			maxRequestBodySize,
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
	}

	public isStartedFromCluster() {
		return this.statedFromServer
	}

	public getClusterName() {
		return this.clusterName
	}
}
