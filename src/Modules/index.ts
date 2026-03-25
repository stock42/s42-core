import { Glob } from 'bun'
import { z } from 'zod'
import { Controller } from '../Controller'
import type { EventsDomain } from '../EventsDomain'
import type { TypeHook } from '../Server/types'

// 🤖🧩📡⚙️🔎⭕️
export const Module = z.object({
	name: z.string(),
	version: z.string(),
	type: z.enum(['mws', 'full', 'share']).default('full'),
	enabled: z.boolean().default(true),
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
		handler: z.function({
			input: z.tuple([
				z.any(),
				z.any(),
				z.object({
					events: z.object({
						emit: z.function({
							input: z.tuple([z.string(), z.any().optional()]),
							output: z.void(),
						}),
					}),
				}),
			]),
			output: z.any(),
		}),
		handleError: z
			.function({
				input: z.tuple([z.any(), z.any(), z.any()]),
				output: z.void(),
			})
			.optional(),
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

export type ModulesStats = {
	totalModulesLoaded: number
	totalModulesFull: number
	totalModulesShare: number
	totalModulesMws: number
	modulesNames: string[]
	modules: ModuleType[]
}

const loadedModulesRegistry = new Map<string, ModuleType>()

export function getModulesStats(): ModulesStats {
	const modules = Array.from(loadedModulesRegistry.values()).sort((left, right) => {
		if (left.type !== right.type) {
			return left.type.localeCompare(right.type)
		}

		if (left.name !== right.name) {
			return left.name.localeCompare(right.name)
		}

		return left.version.localeCompare(right.version)
	})

	return {
		totalModulesLoaded: modules.length,
		totalModulesFull: modules.filter(module => module.type === 'full').length,
		totalModulesShare: modules.filter(module => module.type === 'share').length,
		totalModulesMws: modules.filter(module => module.type === 'mws').length,
		modulesNames: modules.map(module => module.name),
		modules,
	}
}

export function clearModulesStats(): void {
	loadedModulesRegistry.clear()
}

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
	private readonly fullModules: ModuleType[] = []
	private readonly sharedModules: ModuleType[] = []
	private readonly services: ServiceType[] = []
	private readonly models: ModelType[] = []
	private readonly types: TypesType = undefined
	private eventsDomain?: EventsDomain

	private readonly path: string = './'
	constructor(path: string, eventsDomain?: EventsDomain) {
		this.path = this.normalizePath(path)
		this.eventsDomain = eventsDomain
	}

	async load() {
		console.log('🔎 Scanning for modules in', this.path)
		const discoveredModules = await this.discoverModules()

		const middlewareModules = discoveredModules.filter(
			discovered => discovered.module.type === 'mws',
		)
		const shareModules = discoveredModules.filter(
			discovered => discovered.module.type === 'share',
		)
		const fullModules = discoveredModules.filter(
			discovered => discovered.module.type === 'full',
		)

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
		registerModuleStats(module)
		this.trackModule(this.sharedModules, module)

		const moduleDir = this.dirname(moduleFilePath)
		const unsupportedShareDirs = ['controllers', 'events', 'mws']

		for (const dirName of unsupportedShareDirs) {
			const fullDirPath = this.joinPath(moduleDir, dirName)
			if (await this.directoryExists(fullDirPath)) {
				console.warn(
					`⭕️ Share module ${module.name}@${module.version} ignores "${dirName}" directory (${fullDirPath}).`,
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

			console.log('📦 Loading module:', file)
			const moduleFilePath = this.toAbsolutePath(this.joinPath(this.path, file))
			const completedPath = this.toFileImportURL(moduleFilePath)
			const loadedModule = await import(completedPath)
			const module = Module.parse(loadedModule.default)
			if (!module.enabled) {
				console.log('⏭️  Skipping disabled module:', module.name)
				continue
			}
			modulesFound.push({ module, moduleFilePath })
		}

		return modulesFound
	}

	private async loadMiddleware(
		module: ModuleType,
		moduleFilePath: string,
	): Promise<void> {
		registerModuleStats(module)
		const middlewarePath = this.joinPath(this.dirname(moduleFilePath), 'mws', 'index.ts')

		if (!(await this.fileExists(middlewarePath))) {
			throw new Error(
				`Module ${module.name}@${module.version} is type "mws" but missing ${middlewarePath}`,
			)
		}

		const middlewareURL = this.toFileImportURL(middlewarePath)
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
		registerModuleStats(module)
		this.trackModule(this.fullModules, module)
		console.log(
			`⚙️ Loading all controllers for ${module.name}@${module.version} - ${moduleFilePath}`,
		)
		const glob = new Glob('**/*.ts')

		const controllersDir = this.joinPath(this.dirname(moduleFilePath), 'controllers')
		try {
			for await (const file of glob.scan(controllersDir)) {
				console.log('🧩 Loading controller:', file)
				const controllerPath = this.joinPath(controllersDir, file)
				const completedPath = this.toFileImportURL(controllerPath)
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
				const beforeMiddlewares = this.resolveMiddlewareReferences(
					beforeMiddlewareRefs,
				).map(middleware => middleware.beforeRequest)
				const afterMiddlewares = this.resolveMiddlewareReferences(
					afterMiddlewareRefs,
				).map(middleware => middleware.afterRequest)

				this.controllers.push(
					new Controller(controller.method, controller.path, async (req, res) => {
						try {
							await this.executeMiddlewareHandlers(
								beforeMiddlewares,
								req as unknown as Request,
								res as unknown as Response,
							)

							const response = (await controller.handler(req, res, {
								events: {
									emit: (event: string, payload: any) =>
										this.eventsDomain?.emit({
											eventName: `${module.name}.${event}`,
											payload: payload ?? undefined,
										}),
								},
							})) as Response

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
					}),
				)
			}
		} catch (error) {
			if (this.isPathNotFoundError(error)) {
				return
			}
			throw error
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
				console.warn(`❗️ Middleware reference "${reference}" not found.`)
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

	private normalizePath(inputPath: string): string {
		const trimmed = inputPath.trim()
		if (!trimmed) {
			return '.'
		}
		if (trimmed === '/') {
			return '/'
		}
		return trimmed.replace(/\/+$/, '')
	}

	private joinPath(...segments: string[]): string {
		if (!segments.length) {
			return ''
		}

		const [first, ...rest] = segments
		let joined = first
		if (joined !== '/') {
			joined = joined.replace(/\/+$/, '')
		}

		for (const segment of rest) {
			const cleanedSegment = segment.replace(/^\/+|\/+$/g, '')
			if (!cleanedSegment) {
				continue
			}

			if (!joined || joined === '/') {
				joined = joined === '/' ? `/${cleanedSegment}` : cleanedSegment
			} else {
				joined = `${joined}/${cleanedSegment}`
			}
		}

		return joined
	}

	private dirname(filePath: string): string {
		const normalized = filePath.replace(/\/+$/, '')
		const lastSlashIndex = normalized.lastIndexOf('/')
		if (lastSlashIndex <= 0) {
			return '.'
		}
		return normalized.slice(0, lastSlashIndex)
	}

	private toAbsolutePath(filePath: string): string {
		if (filePath.startsWith('/')) {
			return filePath
		}

		const cwd = process.cwd().replace(/\/+$/, '')
		const relative = filePath.replace(/^\.?\//, '')
		return `${cwd}/${relative}`
	}

	private toFileImportURL(filePath: string): string {
		const absolutePath = this.toAbsolutePath(filePath)
		return new URL(absolutePath, 'file://').href
	}

	private async fileExists(filePath: string): Promise<boolean> {
		return Bun.file(filePath).exists()
	}

	private async directoryExists(directoryPath: string): Promise<boolean> {
		const probe = new Glob('*')
		try {
			for await (const _ of probe.scan(directoryPath)) {
				return true
			}
			// Directory exists and may be empty.
			return true
		} catch (error) {
			if (this.isPathNotFoundError(error)) {
				return false
			}
			throw error
		}
	}

	private isPathNotFoundError(error: unknown): boolean {
		if (!error || typeof error !== 'object') {
			return false
		}

		return (
			('code' in error && error.code === 'ENOENT') ||
			('message' in error &&
				typeof error.message === 'string' &&
				error.message.includes('ENOENT'))
		)
	}

	private async loadEvents(module: ModuleType, moduleFilePath: string) {
		if (!this.eventsDomain) {
			console.warn('EventsDomain not configured. Skipping events registration.')
			return
		}

		const eventsDir = this.joinPath(this.dirname(moduleFilePath), 'events')
		const glob = new Glob('**/*.ts')
		try {
			for await (const file of glob.scan(eventsDir)) {
				const eventFilePath = this.joinPath(eventsDir, file)
				const completedPath = this.toFileImportURL(eventFilePath)
				const eventModule = await import(completedPath)
				const baseName = file.split('/').pop() ?? file

				if (baseName === 'emit.ts') {
					this.registerEmitEvents(module, eventModule)
				} else {
					this.registerListenerEvents(module, eventModule)
				}
			}
		} catch (error) {
			if (this.isPathNotFoundError(error)) {
				return
			}
			throw error
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

	private trackModule(collection: ModuleType[], module: ModuleType): void {
		if (
			collection.some(item => {
				return (
					item.name === module.name &&
					item.version === module.version &&
					item.type === module.type
				)
			})
		) {
			return
		}

		collection.push(module)
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

	getLoadedModules(): ModuleType[] {
		return [
			...Array.from(this.middlewareModules.values()).map(middleware => middleware.module),
			...this.sharedModules,
			...this.fullModules,
		]
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

function registerModuleStats(module: ModuleType): void {
	loadedModulesRegistry.set(getModuleKey(module), module)
}

function getModuleKey(module: ModuleType): string {
	return `${module.type}:${module.name}:${module.version}`
}
