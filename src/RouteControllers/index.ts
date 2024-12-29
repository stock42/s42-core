import { type Controller } from '../Controller/index.js'
import {
	type TypeReturnCallback,
	type RouteCheckResult,
	type TypeRoutesMapCache,
	type TypeRequestInternalObject,
} from './types.d.js'

export class RouteControllers {
	private readonly localControllers: Controller[]
	private headers: Record<string, string> = {}
	private routesMapCache: TypeRoutesMapCache = {}
	private static instance: RouteControllers

	private constructor(controllers: Controller[]) {
		this.localControllers = controllers
		this.processAllControllers()
	}

	private processAllControllers(): void {
		this.localControllers.forEach(controller => {
			controller.getMethods().forEach((method: string) => {
				const key = `${method}:${controller.getPath()}`
				this.routesMapCache[key] = controller.getCallback()
			})
		})
	}

	private checkRoute(route: string): RouteCheckResult {
		const result: RouteCheckResult = { exists: false, params: {}, key: '' }
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
			const params: Record<string, string> = {}

			for (let i = 0; i < keyParts.length; i++) {
				if (keyParts[i].startsWith(':')) {
					params[keyParts[i].substring(1)] = routeParts[i]
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

	private setHeaders(): void {
		this.headers = {
			'Surrogate-Control': 'no-store',
			'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
			Pragma: 'no-cache',
			Expires: '0',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Credentials': 'true',
			'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
			'Access-Control-Expose-Headers': 'Content-Length',
			'Access-Control-Allow-Headers':
				'Accept, Authorization, Content-Type, X-Requested-With, Range, apikey, x-access-token',
			'Content-Security-Policy':
				"default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self';",
		}
	}

	private async getJSONBody(req: Request): Promise<Record<string, any>> {
		try {
			const bodyText = await req.text()
			return JSON.parse(bodyText)
		} catch {
			return {}
		}
	}

	private getQueryParams(url: string): Record<string, string> {
		const queryParams: Record<string, string> = {}
		const [, query] = url.split('?')
		if (query) {
			query.split('&').forEach(param => {
				const [key, value] = param.split('=')
				queryParams[key] = decodeURIComponent(value || '')
			})
		}
		return queryParams
	}

	private async getRequestObject(req: Request): Promise<TypeRequestInternalObject> {
		const url = new URL(req.url)
		return {
			headers: { ...(req.headers ?? {}) },
			realIp:
				req.headers.get('x-forwarded-for') ||
				req.headers.get('cf-connecting-ip') ||
				'::1',
			query: this.getQueryParams(url.search),
			body: req.method !== 'GET' ? await this.getJSONBody(req) : {},
			url: url.pathname,
			method: req.method,
		}
	}

	private notFound(): Response {
		return new Response('Not Found', {
			status: 404,
			headers: { 'Content-Type': 'text/plain' },
		})
	}

	private serverError(message = 'Internal Server Error'): Response {
		return new Response(message, {
			status: 500,
			headers: { 'Content-Type': 'text/plain' },
		})
	}

	public getCallback(): TypeReturnCallback {
		return async (req: Request): Promise<Response> => {
			try {
				const url = new URL(req.url)
				const resultCheckPath = this.checkRoute(`${req.method}:${url.pathname}`)
				if (resultCheckPath.exists) {
					this.setHeaders()

					if (req.method === 'OPTIONS') {
						return new Response(null, {
							status: 204,
							headers: this.headers,
						})
					}

					const request = await this.getRequestObject(req)
					const callback = this.routesMapCache[resultCheckPath.key]
					return callback(request)
				}

				return this.notFound()
			} catch (err) {
				console.error('Internal RouteControllers Error:', err)
				return this.serverError()
			}
		}
	}
}
