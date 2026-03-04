import { Glob } from 'bun'
import { z } from 'zod'
import { Controller } from '../Controller'
import type { EventsDomain } from '../EventsDomain'
import type { TypeHook } from '../Server/types'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export const Module = z.object({
	name: z.string(),
	version: z.string(),
	type: z.enum(['mws', 'full', 'share']).default('full'),
})

export const Model = z.object({
	name: z.string(),
	version: z.string(),
	handler: z.function(),
})

export const Service = z.object({
	name: z.string(),
	version: z.string(),
	handler: z.function(),
})

export const Controllers = z.array(
	z.object({
		name: z.string(),
		version: z.string(),
		handler: z.function(),
		handleError: z.function().optional(),
		method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
		path: z.string(),
		enabled: z.boolean().optional(),
		requireBefore: z.array(z.string()).optional(),
		requireAfter: z.array(z.string()).optional(),
		beforeRequest: z.array(z.string()).optional(),
		afterRequest: z.array(z.string()).optional(),
	}),
)

export const Types = z.object(z.record(z.string(), z.any())).optional()

export type ModelType = z.infer<typeof Model>
export type ServiceType = z.infer<typeof Service>
export type ControllerType = z.infer<typeof Controllers>[number]
export type TypesType = z.infer<typeof Types>
export type ModuleType = z.infer<typeof Module>

type TypeDiscoveredModule = {
	module: ModuleType
	moduleFilePath: string
}

type TypeMWSConstructor = () => Promise<unknown> | unknown
type TypeMWSHook = (
	req: Request,
	res: Response,
	next: (req: Request, res: Response) => void,
) => Promise<unknown> | unknown

type TypeRegisteredMiddleware = {
	module: ModuleType
	beforeRequest: TypeHook['handle']
	afterRequest: TypeHook['handle']
}

export class Modules {
	private readonly controllers: Controller[] = []
	private readonly hooks: TypeHook[] = []
	private readonly middlewareModules: Map<string, TypeRegisteredMiddleware> = new Map()
	private readonly sharedModules: ModuleType[] = []
	private readonly services: ServiceType[] = []
	private readonly models: ModelType[] = []
	private readonly types: TypesType
	private eventsDomain?: EventsDomain

	private readonly path: string = './'
	constructor(path: string, eventsDomain?: EventsDomain) {
		this.path = path
		this.eventsDomain = eventsDomain
	}

	async load() {
		console.log('scanning for modules in', this.path)
		const discoveredModules = await this.discoverModules()

		const middlewareModules = discoveredModules.filter(
			discovered => discovered.module.type === 'mws',
		)
		const shareModules = discoveredModules.filter(
			discovered => discovered.module.type === 'share',
		)
		const fullModules = discoveredModules.filter(discovered => discovered.module.type === 'full')

		for (const discovered of middlewareModules) {
			await this.loadMiddleware(discovered.module, discovered.moduleFilePath)
		}

		for (const discovered of shareModules) {
			await this.loadShare(discovered.module, discovered.moduleFilePath)
		}

		for (const discovered of fullModules) {
			await this.loadControllers(discovered.module, discovered.moduleFilePath)
			await this.loadEvents(discovered.module, discovered.moduleFilePath)
		}
	}

	private async loadShare(module: ModuleType, moduleFilePath: string): Promise<void> {
		this.sharedModules.push(module)

		const moduleDir = path.dirname(moduleFilePath)
		const unsupportedShareDirs = ['controllers', 'events', 'mws']

		for (const dirName of unsupportedShareDirs) {
			const fullDirPath = path.join(moduleDir, dirName)
			if (fs.existsSync(fullDirPath)) {
				console.warn(
					`Share module ${module.name}@${module.version} ignores "${dirName}" directory (${fullDirPath}).`,
				)
			}
		}
	}

	private async discoverModules(): Promise<TypeDiscoveredModule[]> {
		const modulesFound: TypeDiscoveredModule[] = []
		const glob = new Glob('**/__module__.ts')

		for await (const file of glob.scan(this.path)) {
			if (!file.endsWith('__module__.ts')) {
				continue
			}

			console.log('loading module:', file)
			const moduleFilePath = path.resolve(this.path, file)
			const completedPath = pathToFileURL(moduleFilePath).href
			const loadedModule = await import(completedPath)
			const module = Module.parse(loadedModule.default)
			modulesFound.push({ module, moduleFilePath })
		}

		return modulesFound
	}

	private async loadMiddleware(module: ModuleType, moduleFilePath: string): Promise<void> {
		const middlewarePath = path.join(path.dirname(moduleFilePath), 'mws', 'index.ts')

		if (!fs.existsSync(middlewarePath)) {
			throw new Error(
				`Module ${module.name}@${module.version} is type "mws" but missing ${middlewarePath}`,
			)
		}

		const middlewareURL = pathToFileURL(middlewarePath).href
		const middlewareModule = await import(middlewareURL)
		const constructor = middlewareModule.default as TypeMWSConstructor | undefined

		if (typeof constructor !== 'function') {
			throw new Error(
				`Module ${module.name}@${module.version} must export default constructor in mws/index.ts`,
			)
		}

		await constructor()

		const beforeRequest = middlewareModule.beforeRequest as TypeMWSHook | undefined
		const afterRequest = (middlewareModule.afterRequest ??
			middlewareModule.exportRequest) as TypeMWSHook | undefined

		if (typeof beforeRequest !== 'function') {
			throw new Error(
				`Module ${module.name}@${module.version} must export beforeRequest in mws/index.ts`,
			)
		}

		if (typeof afterRequest !== 'function') {
			throw new Error(
				`Module ${module.name}@${module.version} must export afterRequest/exportRequest in mws/index.ts`,
			)
		}

		const normalizedBefore = this.wrapMiddlewareHook(beforeRequest)
		const normalizedAfter = this.wrapMiddlewareHook(afterRequest)

		this.middlewareModules.set(module.name, {
			module,
			beforeRequest: normalizedBefore,
			afterRequest: normalizedAfter,
		})
	}

	private wrapMiddlewareHook(hookHandler: TypeMWSHook): TypeHook['handle'] {
		return async (req, res, next) => {
			let nextWasCalled = false
			const trackedNext = (nextReq: Request, nextRes: Response): void => {
				nextWasCalled = true
				next(nextReq, nextRes)
			}

			const result = await hookHandler(req, res, trackedNext)
			if (typeof result === 'function') {
				await result(req, res, trackedNext)
			}

			if (!nextWasCalled) {
				trackedNext(req, res)
			}
		}
	}

	async loadControllers(module: ModuleType, moduleFilePath: string) {
		console.log(
			`loading all controllers for ${module.name}@${module.version} - ${moduleFilePath}`,
		)
		const glob = new Glob('**/*.ts')

		const controllersDir = path.join(path.dirname(moduleFilePath), 'controllers')
		if (!fs.existsSync(controllersDir)) {
			return
		}

		for await (const file of glob.scan(controllersDir)) {
			console.log('loading controller:', file)
			const controllerPath = path.resolve(controllersDir, file)
			const completedPath = pathToFileURL(controllerPath).href
			console.log('completed path:', completedPath)
			const controllerModule = await import(completedPath)
			const controller = controllerModule.default as ControllerType &
				Record<string, unknown>

			const beforeMiddlewareRefs = this.extractRequiredMiddlewareReferences(
				controller,
				'before',
			)
			const afterMiddlewareRefs = this.extractRequiredMiddlewareReferences(
				controller,
				'after',
			)
			const beforeMiddlewares = this.resolveMiddlewareReferences(beforeMiddlewareRefs).map(
				middleware => middleware.beforeRequest,
			)
			const afterMiddlewares = this.resolveMiddlewareReferences(afterMiddlewareRefs).map(
				middleware => middleware.afterRequest,
			)

			this.controllers.push(
				new Controller(
					controller.method,
					controller.path,
					async (req, res) => {
						try {
							await this.executeMiddlewareHandlers(
								beforeMiddlewares,
								req as unknown as Request,
								res as unknown as Response,
							)

							const response = await controller.handler(req, res)

							await this.executeMiddlewareHandlers(
								afterMiddlewares,
								req as unknown as Request,
								res as unknown as Response,
							)
							return response
						} catch (err: unknown) {
							if (controller.handleError) {
								return controller.handleError(req, res, err)
							}
							throw err
						}
					},
				),
			)
		}
	}

	private executeMiddlewareHandlers(
		handlers: Array<TypeHook['handle']>,
		req: Request,
		res: Response,
		index = 0,
	): Promise<void> {
		if (index >= handlers.length) {
			return Promise.resolve()
		}

		return new Promise((resolve, reject) => {
			let nextCalled = false
			const next = (nextReq: Request, nextRes: Response): void => {
				if (nextCalled) {
					return
				}
				nextCalled = true
				this.executeMiddlewareHandlers(handlers, nextReq, nextRes, index + 1)
					.then(resolve)
					.catch(reject)
			}

			Promise.resolve()
				.then(() => handlers[index](req, res, next))
				.then(() => {
					// Keep chain moving even if middleware did not call next()
					if (!nextCalled) {
						next(req, res)
					}
				})
				.catch(reject)
		})
	}

	private extractRequiredMiddlewareReferences(
		controller: Record<string, unknown>,
		when: 'before' | 'after',
	): string[] {
		const explicitProperty = when === 'before' ? 'requireBefore' : 'requireAfter'
		const aliasProperty = when === 'before' ? 'beforeRequest' : 'afterRequest'

		const explicitRefs = this.toStringArray(controller[explicitProperty])
		const aliasRefs = this.toStringArray(controller[aliasProperty])
		return [...new Set([...explicitRefs, ...aliasRefs])]
	}

	private resolveMiddlewareReferences(references: string[]): TypeRegisteredMiddleware[] {
		const resolved: TypeRegisteredMiddleware[] = []
		const seen = new Set<string>()

		for (const reference of references) {
			if (reference === 'mws') {
				for (const [moduleName, middleware] of this.middlewareModules.entries()) {
					if (!seen.has(moduleName)) {
						seen.add(moduleName)
						resolved.push(middleware)
					}
				}
				continue
			}

			const middleware = this.middlewareModules.get(reference)
			if (!middleware) {
				console.warn(`Middleware reference "${reference}" not found.`)
				continue
			}

			if (seen.has(reference)) {
				continue
			}

			seen.add(reference)
			resolved.push(middleware)
		}

		return resolved
	}

	private toStringArray(value: unknown): string[] {
		if (!Array.isArray(value)) {
			return []
		}

		return value.filter((item): item is string => typeof item === 'string')
	}

	private async loadEvents(module: ModuleType, moduleFilePath: string) {
		if (!this.eventsDomain) {
			console.warn('EventsDomain not configured. Skipping events registration.')
			return
		}

		const eventsDir = path.join(path.dirname(moduleFilePath), 'events')
		if (!fs.existsSync(eventsDir)) {
			return
		}

		const glob = new Glob('**/*.ts')
		for await (const file of glob.scan(eventsDir)) {
			const eventFilePath = path.resolve(eventsDir, file)
			const completedPath = pathToFileURL(eventFilePath).href
			const eventModule = await import(completedPath)
			const baseName = path.basename(file)

			if (baseName === 'emit.ts') {
				this.registerEmitEvents(module, eventModule)
			} else {
				this.registerListenerEvents(module, eventModule)
			}
		}
	}

	private registerEmitEvents(module: ModuleType, eventModule: Record<string, any>): void {
		if (!this.eventsDomain) {
			return
		}

		for (const [exportName, value] of Object.entries(eventModule)) {
			if (exportName === 'default' || exportName === 'EVENTS') {
				continue
			}
			if (exportName.endsWith('$Multiple')) {
				continue
			}
			if (typeof value === 'function') {
				continue
			}
			this.eventsDomain.registerEmitter(exportName, module.name)
		}
	}

	private registerListenerEvents(
		module: ModuleType,
		eventModule: Record<string, any>,
	): void {
		if (!this.eventsDomain) {
			return
		}

		const eventsConfig = eventModule.EVENTS
		const defaultHandler = eventModule.default

		if (typeof defaultHandler === 'function') {
			const config = this.resolveEventConfig(eventsConfig, 'default')
			const eventNames = this.resolveEventNamesFromConfig(config)
			if (eventNames.length) {
				const multiple = config?.multiple ?? false
				for (const eventName of eventNames) {
					this.eventsDomain.listen({ eventName, multiple }, defaultHandler, module.name)
				}
			}
		}

		for (const [exportName, exported] of Object.entries(eventModule)) {
			if (exportName === 'default' || exportName === 'EVENTS') {
				continue
			}
			if (typeof exported !== 'function') {
				continue
			}
			const config = this.resolveEventConfig(eventsConfig, exportName)
			const eventNames = this.resolveEventNamesFromConfig(config, exportName)
			const multiple = config?.multiple ?? Boolean(eventModule[`${exportName}$Multiple`])

			for (const eventName of eventNames) {
				this.eventsDomain.listen({ eventName, multiple }, exported, module.name)
			}
		}
	}

	private resolveEventConfig(
		eventsConfig: any,
		handlerName: string,
	): { eventName?: string | string[]; multiple?: boolean } | null {
		if (!eventsConfig) {
			return null
		}
		if (typeof eventsConfig === 'string' || Array.isArray(eventsConfig)) {
			return { eventName: eventsConfig }
		}
		if (typeof eventsConfig !== 'object') {
			return null
		}
		if ((eventsConfig.eventName || eventsConfig.events) && handlerName === 'default') {
			return {
				eventName: eventsConfig.eventName ?? eventsConfig.events,
				multiple: eventsConfig.multiple,
			}
		}
		const handlerConfig = eventsConfig[handlerName]
		if (!handlerConfig) {
			return null
		}
		if (typeof handlerConfig === 'string' || Array.isArray(handlerConfig)) {
			return { eventName: handlerConfig }
		}
		if (typeof handlerConfig === 'boolean') {
			return { multiple: handlerConfig }
		}
		if (typeof handlerConfig === 'object') {
			return {
				eventName: handlerConfig.eventName ?? handlerConfig.events,
				multiple: handlerConfig.multiple,
			}
		}
		return null
	}

	private resolveEventNamesFromConfig(
		config: { eventName?: string | string[] } | null,
		fallbackName?: string,
	): string[] {
		const eventNames = config?.eventName ?? fallbackName
		if (!eventNames) {
			return []
		}
		return Array.isArray(eventNames) ? eventNames : [eventNames]
	}

	setEventsDomain(eventsDomain: EventsDomain): this {
		this.eventsDomain = eventsDomain
		return this
	}
	getControllers(): Controller[] {
		return this.controllers
	}

	getHooks(): TypeHook[] {
		return this.hooks
	}

	getSharedModules(): ModuleType[] {
		return this.sharedModules
	}

	getServices(): ServiceType[] {
		return this.services
	}

	getModels(): ModelType[] {
		return this.models
	}

	getTypes(): TypesType {
		return this.types
	}
}
