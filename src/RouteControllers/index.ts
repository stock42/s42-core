import { type Controller } from '../Controller/index.js'
import { Res } from '../Response/index.js'
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

	constructor(controllers: Controller[]) {
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
		const result: RouteCheckResult = { exists: false, params: {}, key: '' };
		const [purePath] = route.split('?');
		const [method, ...routeParts] = purePath.split(':');
		const routePath = routeParts.join(':');

		for (const key in this.routesMapCache) {
			const [routeMethod, ...keyParts] = key.split(':');
			const keyPath = keyParts.join(':');

			// Verifica si el método coincide o si es un wildcard '*'
			if (routeMethod !== method && routeMethod !== '*') {
				continue;
			}

			// Divide la ruta y la clave en segmentos
			const keySegments = keyPath.split('/');
			const routeSegments = routePath.split('/');

			// Si las longitudes no coinciden y no hay wildcard '*', descarta
			if (keySegments.length !== routeSegments.length && !keySegments.includes('*')) {
				continue;
			}

			let isMatch = true;
			const params: Record<string, string> = {};

			for (let i = 0; i < keySegments.length; i++) {
				const keySegment = keySegments[i];
				const routeSegment = routeSegments[i];

				// Si es un wildcard '*', acepta cualquier segmento
				if (keySegment === '*') {
					break;
				}

				// Si es un parámetro dinámico, almacena el valor
				if (keySegment.startsWith(':')) {
					params[keySegment.substring(1)] = routeSegment;
				} else if (keySegment !== routeSegment) {
					// Si no coincide exactamente, descarta
					isMatch = false;
					break;
				}
			}

			if (isMatch) {
				result.exists = true;
				result.params = params;
				result.key = key;
				break;
			}
		}

		return result;
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
			params: {},
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
					const response = new Res({ headers: this.headers })
					return callback({ ...request, params: resultCheckPath.params }, response) as unknown as Response
				}

				return this.notFound()
			} catch (err) {
				console.error('Internal RouteControllers Error:', err)
				return this.serverError()
			}
		}
	}
}
