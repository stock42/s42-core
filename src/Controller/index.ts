import { type ControllerInterface } from './controller.interface.js'
import { type TYPE_HTTP_METHOD, type Middleware } from './types.d.js'
import { type Res } from '../Response'

export type ControllerStatsEndpoint = {
	method: TYPE_HTTP_METHOD
	path: string
}

export type ControllersStats = {
	totalControllers: number
	totalEndpoints: number
	endpoints: ControllerStatsEndpoint[]
}

const METHOD_ORDER: TYPE_HTTP_METHOD[] = [
	'GET',
	'POST',
	'PUT',
	'PATCH',
	'DELETE',
	'OPTIONS',
	'UPDATE',
	'*',
]

type TypeRegisteredController = {
	getPath(): string
	getMethods(): Array<TYPE_HTTP_METHOD>
}

const registeredControllers = new Set<TypeRegisteredController>()

export function getControllersStats(): ControllersStats {
	const endpointMap = new Map<string, ControllerStatsEndpoint>()

	for (const controller of registeredControllers.values()) {
		for (const method of controller.getMethods()) {
			const endpoint = {
				method,
				path: controller.getPath(),
			}
			endpointMap.set(`${endpoint.method}:${endpoint.path}`, endpoint)
		}
	}

	const endpoints = Array.from(endpointMap.values()).sort((left, right) => {
		if (left.path !== right.path) {
			return left.path.localeCompare(right.path)
		}

		return getMethodOrder(left.method) - getMethodOrder(right.method)
	})

	return {
		totalControllers: registeredControllers.size,
		totalEndpoints: endpoints.length,
		endpoints,
	}
}

export function clearControllersStats(): void {
	registeredControllers.clear()
}

export function trackControllerStats(controller: TypeRegisteredController): void {
	registeredControllers.add(controller)
}

export class Controller implements ControllerInterface {
	private path: string = ''
	private readonly methods = new Set<TYPE_HTTP_METHOD>()
	private callbacks: Array<Middleware> = []

	public constructor(method: TYPE_HTTP_METHOD, path: string, callback: Middleware) {
		this.methods.add(method)
		this.path = path
		this.use(callback)
		trackControllerStats(this)
	}

	public setPath(path: string): this {
		this.path = path
		return this
	}

	public getPath(): string {
		return this.path
	}

	public getMethods(): Array<TYPE_HTTP_METHOD> {
		return Array.from(this.methods)
	}

	private addMethod(method: TYPE_HTTP_METHOD): this {
		this.methods.add(method)
		return this
	}

	// Define HTTP methods
	public update(): this {
		return this.addMethod('UPDATE')
	}

	public patch(): this {
		return this.addMethod('PATCH')
	}

	public options(): this {
		return this.addMethod('OPTIONS')
	}

	public get(): this {
		return this.addMethod('GET')
	}

	public delete(): this {
		return this.addMethod('DELETE')
	}

	public post(): this {
		return this.addMethod('POST')
	}

	public put(): this {
		return this.addMethod('PUT')
	}

	public use(callback: Middleware): this {
		this.callbacks = [callback, ...this.callbacks]
		return this
	}

	public getCallback(): (req: Request, res: Res) => Promise<Response> {
		return async (req: Request, res: Res): Promise<Response> => {
			let index = 0

			const next = async (): Promise<Response | undefined> => {
				if (index < this.callbacks.length) {
					try {
						const middleware = this.callbacks[index]
						index++
						const result = await middleware(req, res)
						if (result instanceof Response) {
							return result
						} else {
							return await next()
						}
					} catch (err) {
						res.status(500)
						return res.json({ error: `Internal Server Error: ${err} into ${this.path}` })
					}
				} else {
					return res.text('End without response')
				}
			}

			try {
				if (this.callbacks.length === 0) {
					return res.json({ error: 'No "uses" set for this endpoint' })
				}

				const toReturn = await next()
				return toReturn as unknown as Response
			} catch (err) {
				return new Response(
					JSON.stringify({ error: 'Internal Server Error', poweredby: 'S42 Core' }),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					},
				)
			}
		}
	}
}

function getMethodOrder(method: TYPE_HTTP_METHOD): number {
	const index = METHOD_ORDER.indexOf(method)
	return index === -1 ? METHOD_ORDER.length : index
}
