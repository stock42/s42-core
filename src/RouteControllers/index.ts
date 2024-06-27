import { type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import { jsonParse } from '../JSONParse/index.js'
import { type Controller } from '../Controller/index.js'

import {
	type TypeReturnCallback,
	type RouteCheckResult,
	type TypeRoutesMapCache,
	type TypeRequestInternalObject,
	type TypeResponseInternalObject,
} from './types.d.js'

export class RouteControllers {
	private readonly localControllers: Controller[]
	private localServerHTTP: Server | null
	private routesMapCache: TypeRoutesMapCache = {}
	static instance: RouteControllers

	constructor(controllers: Controller[]) {
		this.localControllers = controllers
		this.localServerHTTP = null
		this.processAllControllers()
	}

	private processAllControllers() {
		this.localControllers.forEach(controller => {
			controller.getMethods().forEach((method: string) => {
				this.routesMapCache[`${method}:${controller.getPath()}`] =
					controller.getCallback()
			})
		})
		return this
	}

	public setServer(server: Server) {
		this.localServerHTTP = server
	}

	public listen(port: number) {
		if (!this.localServerHTTP) {
			throw new Error('Not Server setted')
		}

		this.localServerHTTP.listen(port, () => {
			console.info(`Ready on *: ${port}`)
		})
	}

	private checkRoute(route: string): RouteCheckResult {
		const result: RouteCheckResult = {
			exists: false,
			params: {},
			key: '',
		}

		const [purePath] = route.split('?')
		const [method] = purePath.split(':')

		for (const key in this.routesMapCache) {
			const [routeMethod] = key.split(':')

			if (method !== routeMethod) {
				continue
			}

			const keyParts = key.split('/')
			const routeParts = purePath.split('/')

			if (keyParts.length !== routeParts.length) {
				continue
			}
			keyParts.shift()
			routeParts.shift()

			let isMatch = true
			const params: { [key: string]: string } = {}

			for (let i = 0; i < keyParts.length; i++) {
				if (keyParts[i].startsWith(':')) {
					const paramName = keyParts[i].substring(1)
					params[paramName] = routeParts[i]
				} else if (keyParts[i] !== routeParts[i]) {
					isMatch = false
					break
				}
			}

			if (isMatch) {
				result.exists = true
				result.params = params
				result.key = key
				break
			}
		}

		return result
	}

	private setHeaders(res: ServerResponse) {
		res.setHeader('Surrogate-Control', 'no-store')
		res.setHeader(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate',
		)
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')

		res.setHeader('Access-Control-Allow-Origin', '*')
		res.setHeader('Access-Control-Allow-Credentials', 'true')
		res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
		res.setHeader('Access-Control-Expose-Headers', 'Content-Length')
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Accept, Authorization, Content-Type, X-Requested-With, Range, apikey, x-access-token',
		)
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;",
		)
	}

	private async getJSONBody(req: IncomingMessage) {
		try {
			const data = await jsonParse(req)
			return data
		} catch (err) {
			return {}
		}
	}

	private getQueryParams(url: string): { [key: string]: string } {
		const queryParams: { [key: string]: string } = {}
		const [, query] = url.split('?')
		if (query) {
			query.split('&').forEach(param => {
				const [key, value] = param.split('=')
				queryParams[key] = decodeURIComponent(value)
			})
		}
		return queryParams
	}

	private async getRequestObject(
		req: IncomingMessage,
	): Promise<TypeRequestInternalObject> {
		let realIp = '::1'
		if (req.headers && req.headers['x-forwarded-for']) {
			const parts = String(req?.headers['x-forwarded-for']).split(',')
			realIp = String(parts.shift())
		}

		if (req.socket.remoteAddress) {
			realIp = String(req.socket.remoteAddress)
		}

		return {
			headers: { ...(req?.headers ?? {}) },
			realIp,
			query: this.getQueryParams(String(req.url)),
			body: req.method !== 'GET' ? await this.getJSONBody(req) : {},
			url: req.url,
			method: req.method,
		} as TypeRequestInternalObject
	}

	private getResponseObject(res: ServerResponse): TypeResponseInternalObject {
		return {
			end: (body: string) => res.end(body),
			json: (body: object) => {
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify(body))
			},
			jsonError: (body: object) => {
				res.writeHead(500, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify(body))
			},
			_404: (body: string) => {
				this.notFound(res, body)
			},
			_500: (body: string) => {
				this.serverError(res, body)
			},
		} as TypeResponseInternalObject
	}

	private notFound(res: ServerResponse, message = 'Not Found') {
		res.writeHead(404, { 'Content-Type': 'text/html' })
		res.end(message)
	}

	private serverError(res: ServerResponse, message = 'Internal Server Error') {
		res.writeHead(500, { 'Content-Type': 'text/html' })
		res.end(message)
	}

	public getCallback(): TypeReturnCallback {
		return async (req: IncomingMessage, res: ServerResponse) => {
			const resultCheckPath = this.checkRoute(`${req.method}:${req.url}`)
			if (resultCheckPath.exists) {
				if (req.method === 'OPTIONS') {
					return res.writeHead(200)
				}
				this.setHeaders(res)
				const request = await this.getRequestObject(req)
				const response = this.getResponseObject(res)
				return this.routesMapCache[resultCheckPath.key](request, response)
			}

			this.notFound(res)
		}
	}

	static getInstance(controllers: Controller[]) {
		if (!RouteControllers.instance) {
			RouteControllers.instance = new RouteControllers(controllers)
		}
		return RouteControllers.instance
	}
}
