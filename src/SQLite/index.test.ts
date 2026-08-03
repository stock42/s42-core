import { describe, expect, test } from 'bun:test'
import { SQLite } from './index'

describe('SQLite — shared WHERE translator', () => {
	test('executes null and recursive logical filters through bun:sqlite', async () => {
		const db = new SQLite({ type: 'memory' })

		try {
			db.createTable('items', {
				id: 'INTEGER PRIMARY KEY',
				status: 'TEXT',
				deleted_at: 'TEXT',
				score: 'INTEGER',
			})
			db.insert('items', { id: 1, status: 'active', deleted_at: null, score: 5 })
			db.insert('items', { id: 2, status: 'pending', deleted_at: null, score: 15 })
			db.insert('items', {
				id: 3,
				status: 'active',
				deleted_at: '2026-08-03T12:00:00.000Z',
				score: 15,
			})

			const rows = await db.select<{ id: number }>(
				'items',
				['id'],
				{
					deleted_at: null,
					$or: [{ status: 'active' }, { score: { $between: [10, 20] } }],
				},
				{ id: 1 },
			)

			expect(rows).toEqual([{ id: 1 }, { id: 2 }])
			expect(await db.select('items', ['id'], { id: { $in: [] } })).toEqual([])
		} finally {
			db.close()
		}
	})
})
