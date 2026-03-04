import { type Controller } from '../Controller/index.js'
import { Res } from '../Response/index.js'
import type { TypeHook } from '../Server/types.js'
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
        const result: RouteCheckResult = { exists: false, params: {}, key: '' }
        const [purePath] = route.split('?')
        const [method, ...routeParts] = purePath.split(':')
        const routePath = routeParts.join(':')

        for (const key in this.routesMapCache) {
            const [routeMethod, ...keyParts] = key.split(':')
            const keyPath = keyParts.join(':')

            if (routeMethod !== method && routeMethod !== '*') {
                continue
            }

            const keySegments = keyPath.split('/')
            const routeSegments = routePath.split('/')

            if (keySegments.length !== routeSegments.length && !keySegments.includes('*')) {
                continue
            }

            let isMatch = true
            const params: Record<string, string> = {}

            for (let i = 0; i < keySegments.length; i++) {
                const keySegment = keySegments[i]
                const routeSegment = routeSegments[i]

                if (keySegment === '*') {
                    break
                }

                if (keySegment.startsWith(':')) {
                    params[keySegment.substring(1)] = routeSegment
                } else if (keySegment !== routeSegment) {
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

    private matchHooks(hooks: TypeHook[], method: string, path: string): TypeHook[] {
        const matchedHooks: TypeHook[] = []
        const routeKey = `${method}:${path}`

        for (const hook of hooks) {
            const hookKey = `${hook.method}:${hook.path}`

            // Check method match (exact or wildcard)
            if (hook.method !== method && hook.method !== '*') {
                continue
            }

            // Check path match
            const [hookMethod, ...hookPathParts] = hookKey.split(':')
            const hookPath = hookPathParts.join(':')
            const [reqMethod, ...reqPathParts] = routeKey.split(':')
            const reqPath = reqPathParts.join(':')

            const hookSegments = hookPath.split('/')
            const reqSegments = reqPath.split('/')

            if (hookSegments.length !== reqSegments.length && !hookSegments.includes('*')) {
                continue
            }

            let isMatch = true
            for (let i = 0; i < hookSegments.length; i++) {
                const hookSegment = hookSegments[i]
                const reqSegment = reqSegments[i]

                if (hookSegment === '*') {
                    break
                }

                if (hookSegment.startsWith(':')) {
                    continue // Parameters are allowed
                } else if (hookSegment !== reqSegment) {
                    isMatch = false
                    break
                }
            }

            if (isMatch) {
                matchedHooks.push(hook)
            }
        }

        return matchedHooks
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
        const contentType = req.headers.get('content-type')?.toLowerCase() ?? ''
        const isFormData =
            contentType.includes('multipart/form-data') ||
            contentType.includes('application/x-www-form-urlencoded')

        let parsedFormData: FormData | null = null
        if (isFormData) {
            try {
                parsedFormData = await req.formData()
            } catch {
                parsedFormData = new FormData()
            }
        }

        const body = req.method !== 'GET' && !isFormData ? await this.getJSONBody(req) : {}

        return {
            headers: req.headers,
            realIp:
                req.headers.get('x-forwarded-for') ||
                req.headers.get('cf-connecting-ip') ||
                '::1',
            query: this.getQueryParams(url.search),
            body,
            url: url.pathname,
            method: req.method,
            params: {},
            formData: () => parsedFormData ?? new FormData(),
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

    private hookError(err: unknown): Response {
        const message = err instanceof Error ? err.message : 'Hook execution failed'
        const isAuthError = /(token|auth|unauthoriz|forbidden)/i.test(message)
        const status = isAuthError ? 401 : 500

        return new Response(
            JSON.stringify({
                ok: false,
                error: message,
            }),
            {
                status,
                headers: {
                    ...this.headers,
                    'Content-Type': 'application/json',
                },
            },
        )
    }

    private async executeHooks(
        hooks: TypeHook[],
        req: Request,
        res: Res,
        index = 0,
    ): Promise<void> {
        if (index >= hooks.length) {
            return
        }

        await new Promise<void>((resolve, reject) => {
            const hook = hooks[index]
            let nextCalled = false

            const runNext = (nextReq: Request, nextRes: Response): void => {
                if (nextCalled) {
                    return
                }

                nextCalled = true
                this.executeHooks(hooks, nextReq, nextRes as unknown as Res, index + 1)
                    .then(resolve)
                    .catch(reject)
            }

            Promise.resolve()
                .then(() => hook.handle(req, res as unknown as Response, runNext))
                .then(() => {
                    // Keep chain moving even if hook forgot to call next()
                    if (!nextCalled) {
                        runNext(req, res as unknown as Response)
                    }
                })
                .catch(reject)
        })
    }

    public getCallback(hooks: TypeHook[]): TypeReturnCallback {
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
                    request.params = resultCheckPath.params
                    const response = new Res({ headers: this.headers })
                    const callback = this.routesMapCache[resultCheckPath.key]

                    // Find matching hooks
                    const matchedHooks = this.matchHooks(hooks, req.method, url.pathname)
                    const beforeHooks = matchedHooks.filter(hook => hook.when === 'before')
                    const afterHooks = matchedHooks.filter(hook => hook.when === 'after')

                    let finalResponse: Response | null = null

                    try {
                        await this.executeHooks(beforeHooks, req, response)
                    } catch (hookError) {
                        console.error('Error executing before hooks:', hookError)
                        return this.hookError(hookError)
                    }

                    // Execute controller callback
                    finalResponse = (await callback(request, response)) as unknown as Response

                    try {
                        await this.executeHooks(afterHooks, req, response)
                    } catch (hookError) {
                        // Keep response path healthy even if post-processing hook fails
                        console.error('Error executing after hooks:', hookError)
                    }

                    return finalResponse
                }

                return this.notFound()
            } catch (err) {
                console.error('Internal RouteControllers Error:', err)
                return this.serverError()
            }
        }
    }
}
