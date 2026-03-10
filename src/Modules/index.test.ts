import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { clearControllersStats } from '../Controller'
import { clearModulesStats, getModulesStats, Modules } from './index'

describe('getModulesStats', () => {
	let fixtureDir = ''

	beforeEach(async () => {
		clearControllersStats()
		clearModulesStats()
		fixtureDir = await mkdtemp(join(tmpdir(), 's42-core-modules-'))

		await mkdir(join(fixtureDir, 'auth', 'mws'), { recursive: true })
		await mkdir(join(fixtureDir, 'share'), { recursive: true })
		await mkdir(join(fixtureDir, 'operators', 'controllers'), { recursive: true })

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

		expect(stats.totalModulesLoaded).toBe(3)
		expect(stats.totalModulesMws).toBe(1)
		expect(stats.totalModulesShare).toBe(1)
		expect(stats.totalModulesFull).toBe(1)
		expect([...stats.modulesNames].sort()).toEqual(['auth', 'operators', 'share'])
		expect(stats.modules.map(module => module.name).sort()).toEqual([
			'auth',
			'operators',
			'share',
		])
	})
})
