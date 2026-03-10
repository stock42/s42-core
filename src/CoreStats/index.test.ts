import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { clearControllersStats, Controller, getControllersStats } from '../Controller'
import { clearModulesStats } from '../Modules'
import { RouteControllers } from '../RouteControllers'
import {
	CoreStats,
	type CoreStatsCommand,
	type CoreStatsCommandResult,
} from './index'

const commandOutputs: Record<CoreStatsCommand, CoreStatsCommandResult> = {
	'free -m': {
		command: 'free -m',
		ok: true,
		output: `               total        used        free      shared  buff/cache   available
Mem:            2048        1024         512          10         512        1536`,
	},
	'df -h': {
		command: 'df -h',
		ok: true,
		output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       100G   40G   60G  40% /`,
	},
	uptime: {
		command: 'uptime',
		ok: true,
		output: '10:00:00 up 5 days,  2 users,  load average: 0.20, 0.15, 0.10',
	},
	who: {
		command: 'who',
		ok: true,
		output: 'admin tty1 2026-03-10 09:00\nops pts/0 2026-03-10 09:05',
	},
	'cpupower frequency-info': {
		command: 'cpupower frequency-info',
		ok: true,
		output: 'current CPU frequency: 3.20 GHz',
	},
}

describe('CoreStats', () => {
	beforeEach(() => {
		clearControllersStats()
		clearModulesStats()
		delete process.env.ENABLE_CORE_STATS
	})

	afterEach(() => {
		delete process.env.ENABLE_CORE_STATS
	})

	test('does not inject the stats route when disabled', () => {
		const health = new Controller('GET', '/health', async (_req, res) => {
			return res.json({ ok: true })
		})

		const router = new RouteControllers([health])
		const routes = router.getRoutes([])

		expect(routes['/core/stats']).toBeUndefined()
		expect(getControllersStats().totalControllers).toBe(1)
	})

	test('injects the stats route automatically and returns stats payload', async () => {
		process.env.ENABLE_CORE_STATS = 'true'

		const health = new Controller('GET', '/health', async (_req, res) => {
			return res.json({ ok: true })
		})
		const users = new Controller('GET', '/users', async (_req, res) => {
			return res.json({ ok: true })
		}).post()

		const router = new RouteControllers([health, users])
		const coreStats = new CoreStats({
			enabled: true,
			commandRunner: async command => commandOutputs[command],
		})

		const routes = router.getRoutes([])
		const stats = await coreStats.getStats()

		expect(typeof routes['/core/stats']?.GET).toBe('function')
		expect(getControllersStats().totalControllers).toBe(3)
		expect(stats.summary.totalControllers).toBe(3)
		expect(stats.summary.totalEndpoints).toBe(4)
		expect(stats.summary.totalModulesLoaded).toBe(0)
		expect(stats.endpoints).toEqual([
			{ method: 'GET', path: '/core/stats' },
			{ method: 'GET', path: '/health' },
			{ method: 'GET', path: '/users' },
			{ method: 'POST', path: '/users' },
		])
		expect(stats.system.memory.totalMB).toBe(2048)
		expect(stats.system.memory.usedMB).toBe(1024)
		expect(stats.system.memory.availableMB).toBe(1536)
		expect(stats.system.disk.root?.available).toBe('60G')
		expect(stats.system.connectedUsers.totalUsers).toBe(2)
		expect(stats.system.cpuFrequency.raw).toContain('3.20 GHz')
	})

	test('keeps an existing stats controller instead of injecting a duplicate', () => {
		process.env.ENABLE_CORE_STATS = 'true'

		const customStats = new Controller('GET', '/core/stats', async (_req, res) => {
			return res.json({ from: 'custom' })
		})

		const router = new RouteControllers([customStats])
		const routes = router.getRoutes([])

		expect(typeof routes['/core/stats']?.GET).toBe('function')
		expect(getControllersStats().totalControllers).toBe(1)
		expect(getControllersStats().totalEndpoints).toBe(1)
	})
})
