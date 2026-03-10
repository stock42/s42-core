import { beforeEach, describe, expect, test } from 'bun:test'
import {
	clearControllersStats,
	Controller,
	getControllersStats,
} from './index'

describe('getControllersStats', () => {
	beforeEach(() => {
		clearControllersStats()
	})

	test('tracks controller count and registered endpoints', () => {
		const users = new Controller('GET', '/users', async (_req, res) => {
			return res.json({ ok: true })
		})

		users.post()

		const stats = getControllersStats()

		expect(stats.totalControllers).toBe(1)
		expect(stats.totalEndpoints).toBe(2)
		expect(stats.endpoints).toEqual([
			{ method: 'GET', path: '/users' },
			{ method: 'POST', path: '/users' },
		])
	})
})
