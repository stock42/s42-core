import { type ControllerInterface } from './controller.interface.js'
import { type TYPE_HTTP_METHOD, type Middleware } from './types.d.js'

export class Controller implements ControllerInterface {
	private path: string = ''
	private methods = new Set<TYPE_HTTP_METHOD>()
	private callbacks: Array<Middleware> = []

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
		this.callbacks.push(callback)
		return this
	}

	public getCallback(): (req: any) => Promise<Response> {
		return async (req: any): Promise<Response> => {
			let index = 0

			const next = (): Response => {
				if (index < this.callbacks.length) {
					const middleware = this.callbacks[index]
					index++
					return middleware(req, next) as Response
				} else {
					return new Response('End use case', { status: 200 })
				}
			}

			try {
				if (this.callbacks.length === 0) {
					return new Response(
						JSON.stringify({ error: 'No "uses" set for this endpoint' }),
						{
							status: 200,
							headers: { 'Content-Type': 'application/json' },
						},
					)
				}

				return next() as Response
			} catch (err) {
				new Response(JSON.stringify({ error: 'Internal Server Error' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				})
			}
		}
	}
}
