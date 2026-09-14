import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { clearControllersStats } from '../Controller'
import type { EventsDomain } from '../EventsDomain'
import { setLogSink, type LogSink } from '../Logger'
import { Res } from '../Response'
import { clearStaticRoutesStats, getStaticRoutesStats } from '../StaticRoutes'
import { clearWebSocketControllersStats } from '../WebSocketController'
import { clearModulesStats, getModulesStats, Module, Modules } from './index'

const defaultLogSink: LogSink = {
	debug: (...args) => console.log(...args),
	info: (...args) => console.info(...args),
	warn: (...args) => console.warn(...args),
	error: (...args) => console.error(...args),
}

describe('getModulesStats', () => {
	let fixtureDir = ''

	beforeEach(async () => {
		clearControllersStats()
		clearWebSocketControllersStats()
		clearStaticRoutesStats()
		clearModulesStats()
		fixtureDir = await mkdtemp(join(tmpdir(), 's42-core-modules-'))

		await mkdir(join(fixtureDir, 'auth', 'mws'), { recursive: true })
		await mkdir(join(fixtureDir, 'share'), { recursive: true })
		await mkdir(join(fixtureDir, 'operators', 'controllers'), { recursive: true })
		await mkdir(join(fixtureDir, 'operators', 'websockets'), { recursive: true })
		await mkdir(join(fixtureDir, 'website', 'public'), { recursive: true })

		await writeFile(
			join(fixtureDir, 'auth', '__module__.ts'),
			`export default { name: 'auth', version: '1.0.0', type: 'mws' }\n`,
		)
		await writeFile(
			join(fixtureDir, 'auth', 'mws', 'index.ts'),
			`export default () => {}\nexport const beforeRequest = (_req, _res, next) => next(_req, _res)\nexport const afterRequest = (_req, _res, next) => next(_req, _res)\n`,
		)
		await writeFile(
			join(fixtureDir, 'share', '__module__.ts'),
			`export default { name: 'share', version: '1.0.0', type: 'share' }\n`,
		)
		await writeFile(
			join(fixtureDir, 'operators', '__module__.ts'),
			`export default { name: 'operators', version: '1.0.0', type: 'full' }\n`,
		)
		await writeFile(
			join(fixtureDir, 'operators', 'controllers', 'list.ts'),
			`export default { name: 'operators.list', version: '1.0.0', method: 'GET', path: '/operators/list', handler: async (_req, res) => res.json({ ok: true }) }\n`,
		)
		await writeFile(
			join(fixtureDir, 'operators', 'websockets', 'stream.ts'),
			`export default { name: 'operators.stream', version: '1.0.0', path: '/ws/operators/:operatorId', upgrade: ({ params }) => ({ data: { operatorId: params.operatorId } }), message: (ws, message) => ws.send(message) }\n`,
		)
		await writeFile(
			join(fixtureDir, 'website', '__module__.ts'),
			`export default { name: 'website', version: '1.0.0', type: 'static', path: '/site' }\n`,
		)
		await writeFile(
			join(fixtureDir, 'website', 'public', 'index.html'),
			'<h1>Website</h1>',
		)
	})

	afterEach(async () => {
		if (fixtureDir) {
			await rm(fixtureDir, { recursive: true, force: true })
		}
	})

	test('tracks loaded modules after load()', async () => {
		const modules = new Modules(fixtureDir)
		await modules.load()

		const stats = getModulesStats()

		expect(stats.totalModulesLoaded).toBe(4)
		expect(stats.totalModulesMws).toBe(1)
		expect(stats.totalModulesShare).toBe(1)
		expect(stats.totalModulesFull).toBe(1)
		expect(stats.totalModulesStatic).toBe(1)
		expect([...stats.modulesNames].sort()).toEqual([
			'auth',
			'operators',
			'share',
			'website',
		])
		expect(stats.modules.map(module => module.name).sort()).toEqual([
			'auth',
			'operators',
			'share',
			'website',
		])
		expect(getStaticRoutesStats()).toEqual({
			totalModules: 1,
			totalFiles: 1,
			totalRoutes: 3,
			paths: ['/site'],
		})
		expect(Object.keys(modules.getStaticRoutes().getRoutes()).sort()).toEqual([
			'/site',
			'/site/',
			'/site/index.html',
		])
		expect(modules.getLoadedModules().map(module => module.type)).toEqual([
			'mws',
			'share',
			'full',
			'static',
		])
	})

	test.each(['absolute', 'relative', 'parent segments', 'forward slashes'])(
		'loads and executes modules using %s paths with spaces, Unicode, # and %%',
		async pathStyle => {
			const specialDir = `${fixtureDir} módulos #100%`
			await rename(fixtureDir, specialDir)
			fixtureDir = specialDir

			await mkdir(join(fixtureDir, 'operators', 'events', 'nested'), {
				recursive: true,
			})
			await mkdir(join(fixtureDir, 'operators', 'controllers', 'nested'), {
				recursive: true,
			})
			await rename(
				join(fixtureDir, 'operators', 'controllers', 'list.ts'),
				join(fixtureDir, 'operators', 'controllers', 'nested', 'list #100%.ts'),
			)
			await writeFile(
				join(fixtureDir, 'auth', 'mws', 'index.ts'),
				`export default () => {}
export const beforeRequest = (_req, res, next) => { res.setHeader('X-Before', 'loaded'); next(_req, res) }
export const afterRequest = (_req, _res, next) => next(_req, _res)
`,
			)
			await writeFile(
				join(fixtureDir, 'operators', 'controllers', 'nested', 'list #100%.ts'),
				`export default { name: 'operators.list', version: '1.0.0', method: 'GET', path: '/operators/list', requireBefore: ['auth'], handler: (_req, res) => res.json({ ok: true }) }\n`,
			)
			await rename(
				join(fixtureDir, 'operators', 'websockets', 'stream.ts'),
				join(fixtureDir, 'operators', 'websockets', 'stream #100%.ts'),
			)
			await writeFile(
				join(fixtureDir, 'operators', 'events', 'nested', 'emit.ts'),
				`export const Item$Created = {}\n`,
			)
			await writeFile(
				join(fixtureDir, 'operators', 'events', 'nested', 'listen #100%.ts'),
				`export const Item$Created = () => {}\n`,
			)

			const emitters: string[] = []
			const listeners: string[] = []
			const events = {
				registerEmitter: (eventName, moduleName) => {
					emitters.push(`${moduleName}.${eventName}`)
				},
				listen: (input, handler, moduleName) => {
					expect(typeof handler).toBe('function')
					listeners.push(`${moduleName}.${input.eventName}`)
				},
			} satisfies Pick<EventsDomain, 'registerEmitter' | 'listen'>

			let modulePath = fixtureDir
			if (pathStyle === 'relative') {
				modulePath = relative(process.cwd(), fixtureDir)
			} else if (pathStyle === 'parent segments') {
				modulePath = `${fixtureDir}${sep}operators${sep}..${sep}`
			} else if (pathStyle === 'forward slashes') {
				modulePath = `${fixtureDir.replaceAll(sep, '/')}/`
			}

			const modules = new Modules(modulePath, events as EventsDomain)
			await modules.load()

			expect(modules.getLoadedModules()).toHaveLength(4)
			expect(modules.getWebSocketControllers()).toHaveLength(1)
			expect(emitters).toEqual(['operators.Item$Created'])
			expect(listeners).toEqual(['operators.Item$Created'])
			const controllers = modules.getControllers()
			expect(controllers).toHaveLength(1)
			const response = await controllers[0].getCallback()(
				new Request('http://localhost/operators/list'),
				new Res({}),
			)
			expect(response.status).toBe(200)
			expect(response.headers.get('X-Before')).toBe('loaded')
			expect(await response.json()).toEqual({ ok: true })
			const staticRoutes = modules.getStaticRoutes().getRoutes()
			const staticResponse = await staticRoutes['/site/index.html'].GET(
				new Request('http://localhost/site/index.html'),
			)
			expect(await staticResponse.text()).toBe('<h1>Website</h1>')
		},
	)

	test('runs module initialize hooks after each module is loaded', async () => {
		const initializeEventsKey = '__s42CoreInitializeEvents'
		;(globalThis as Record<string, unknown>)[initializeEventsKey] = []

		await writeFile(
			join(fixtureDir, 'auth', '__module__.ts'),
			`export default { name: 'auth', version: '1.0.0', type: 'mws', initialize: () => globalThis.${initializeEventsKey}.push('auth') }\n`,
		)
		await writeFile(
			join(fixtureDir, 'share', '__module__.ts'),
			`export default { name: 'share', version: '1.0.0', type: 'share', initialize: async () => { await Bun.sleep(1); globalThis.${initializeEventsKey}.push('share') } }\n`,
		)
		await writeFile(
			join(fixtureDir, 'operators', '__module__.ts'),
			`export default { name: 'operators', version: '1.0.0', type: 'full', initialize: () => globalThis.${initializeEventsKey}.push('operators') }\n`,
		)
		await writeFile(
			join(fixtureDir, 'website', '__module__.ts'),
			`export default { name: 'website', version: '1.0.0', type: 'static', path: '/site', initialize: () => globalThis.${initializeEventsKey}.push('website') }\n`,
		)

		const modules = new Modules(fixtureDir)
		await modules.load()

		expect((globalThis as Record<string, unknown>)[initializeEventsKey]).toEqual([
			'auth',
			'share',
			'operators',
			'website',
		])

		delete (globalThis as Record<string, unknown>)[initializeEventsKey]
	})

	test('discovers enabled WebSocket controllers from full modules', async () => {
		await writeFile(
			join(fixtureDir, 'operators', 'websockets', 'disabled.ts'),
			`export default { enabled: false }\n`,
		)

		const modules = new Modules(fixtureDir)
		await modules.load()

		expect(modules.getWebSocketControllers()).toHaveLength(1)
		expect(modules.getWebSocketControllers()[0]?.getPath()).toBe(
			'/ws/operators/:operatorId',
		)
	})

	test('accepts full modules without a websockets directory', async () => {
		await rm(join(fixtureDir, 'operators', 'websockets'), {
			recursive: true,
			force: true,
		})

		const modules = new Modules(fixtureDir)
		await modules.load()

		expect(modules.getWebSocketControllers()).toEqual([])
	})

	test('validates static module paths and requires public for enabled modules', async () => {
		expect(
			Module.safeParse({
				name: 'missing-path',
				version: '1.0.0',
				type: 'static',
			}).success,
		).toBe(false)
		expect(
			Module.safeParse({
				name: 'invalid-path',
				version: '1.0.0',
				type: 'static',
				path: '/invalid/',
			}).success,
		).toBe(false)
		expect(
			Module.safeParse({
				name: 'full-with-path',
				version: '1.0.0',
				type: 'full',
				path: '/invalid',
			}).success,
		).toBe(false)
		expect(Module.parse({ name: 'legacy', version: '1.0.0' }).type).toBe('full')

		await rm(join(fixtureDir, 'website', 'public'), {
			recursive: true,
			force: true,
		})
		await expect(new Modules(fixtureDir).load()).rejects.toThrow(
			'missing public directory',
		)
	})

	test('does not inspect public for disabled static modules', async () => {
		await writeFile(
			join(fixtureDir, 'website', '__module__.ts'),
			`export default { name: 'website', version: '1.0.0', type: 'static', path: '/site', enabled: false }\n`,
		)
		await rm(join(fixtureDir, 'website', 'public'), {
			recursive: true,
			force: true,
		})

		const modules = new Modules(fixtureDir)
		await modules.load()

		expect(getModulesStats().totalModulesStatic).toBe(0)
		expect(modules.getStaticRoutes().getRoutes()).toEqual({})
	})

	test('fails load with the file and reason for an invalid definition', async () => {
		const invalidPath = join(fixtureDir, 'operators', 'websockets', 'invalid.ts')
		await writeFile(
			invalidPath,
			`export default { name: 'operators.invalid', version: '1.0.0', path: '/ws/invalid', upgrade: 'not-a-function' }\n`,
		)

		const modules = new Modules(fixtureDir)
		const loading = modules.load()

		await expect(loading).rejects.toThrow(invalidPath)
		await expect(loading).rejects.toThrow('upgrade must be a function when provided')
	})

	test('ignores websockets in share modules and emits a warning', async () => {
		await mkdir(join(fixtureDir, 'share', 'websockets'), { recursive: true })
		await writeFile(
			join(fixtureDir, 'share', 'websockets', 'ignored.ts'),
			`export default { name: 'share.ignored', version: '1.0.0', path: '/ws/share', upgrade: () => ({ data: {} }) }\n`,
		)

		const warnings: unknown[][] = []
		setLogSink({
			debug: () => {},
			info: () => {},
			warn: (...args) => warnings.push(args),
			error: () => {},
		})

		try {
			const modules = new Modules(fixtureDir)
			await modules.load()

			expect(modules.getWebSocketControllers()).toHaveLength(1)
			expect(
				warnings.some(args => String(args[0]).includes('ignores "websockets"')),
			).toBe(true)
		} finally {
			setLogSink(defaultLogSink)
		}
	})

	test('ignores application directories in static modules and emits a warning', async () => {
		await mkdir(join(fixtureDir, 'website', 'controllers'), { recursive: true })
		await writeFile(
			join(fixtureDir, 'website', 'controllers', 'ignored.ts'),
			`export default { name: 'ignored', version: '1.0.0', method: 'GET', path: '/ignored', handler: () => new Response('ignored') }\n`,
		)

		const warnings: unknown[][] = []
		setLogSink({
			debug: () => {},
			info: () => {},
			warn: (...args) => warnings.push(args),
			error: () => {},
		})

		try {
			const modules = new Modules(fixtureDir)
			await modules.load()

			expect(modules.getControllers()).toHaveLength(1)
			expect(
				warnings.some(args => String(args[0]).includes('ignores "controllers"')),
			).toBe(true)
		} finally {
			setLogSink(defaultLogSink)
		}
	})
})
