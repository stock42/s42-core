import { type ControllerInterface } from './controller.interface.js'

import { type TYPE_HTTP_METHOD, type Middleware } from './types.d.js'

export class Controller implements ControllerInterface {
	private path: string = ''
	private methods: Array<TYPE_HTTP_METHOD> = []
	private callbacks: Array<Middleware> = []
	constructor() {
		return this
	}

	public getMethods() {
		return this.methods
	}

	public setPath(path: string) {
		this.path = path
		return this
	}

	public getPath() {
		return this.path
	}

	public update() {
		const method = 'UPDATE'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public patch() {
		const method = 'PATCH'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public options() {
		const method = 'OPTIONS'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public get() {
		const method = 'GET'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public delete() {
		const method = 'DELETE'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public post() {
		const method = 'POST'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public put() {
		const method = 'PUT'
		if (this.methods.indexOf(method) === -1) {
			this.methods.push(method)
		}
		return this
	}

	public use(callback: (req: any, res: any, next?: Middleware) => void) {
		this.callbacks.push(callback)
		return this
	}

	public getCallback(): (req: any, res: any) => void {
		return async (req: any, res: any) => {
			let index = 0
			const next = () => {
				if (index < this.callbacks.length) {
					const middleware = this.callbacks[index]
					index++
					middleware(req, res, next)
				} else {
					res.end('End use case')
				}
			}

			try {
				if (this.callbacks.length === 0) {
					res.writeHead(200, { 'Content-Type': 'application/json' })
					return res.end(JSON.stringify({ error: 'No "uses" setted for this endpoint' }))
				}

				next()
			} catch (err) {
				res.writeHead(500, { 'Content-Type': 'application/json' })
				return res.end(JSON.stringify({ error: 'Internal Server Error' }))
			}
		}
	}
}
