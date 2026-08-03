import { describe, expect, test } from 'bun:test'
import { SQLite } from './index'
import { SQLError, isSQLError } from '../SQL'

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

describe('SQLite — normalized driver errors', () => {
	test('shares the public SQLError contract with the multi-engine wrapper', () => {
		const db = new SQLite({ type: 'memory' })

		try {
			db.createTable('error_items', {
				id: 'INTEGER PRIMARY KEY',
				email: 'TEXT UNIQUE',
			})
			db.insert('error_items', { id: 1, email: 'operator@stock42.com' })

			let caught: unknown
			try {
				db.insert('error_items', { id: 2, email: 'operator@stock42.com' })
			} catch (error) {
				caught = error
			}

			expect(isSQLError(caught, 'unique_violation')).toBe(true)
			expect(caught).toBeInstanceOf(SQLError)
			if (!(caught instanceof SQLError)) {
				throw new Error('Expected a normalized SQLError')
			}
			expect(caught.dialect).toBe('sqlite')
			expect(caught.nativeCode).toBe('SQLITE_CONSTRAINT_UNIQUE')
			expect(caught.errno).toBe(2067)
			expect(caught.message).toBe('UNIQUE constraint failed: error_items.email')
			expect(caught.cause).toBeInstanceOf(Error)
		} finally {
			db.close()
		}
	})

	test('keeps validation errors outside the SQL error taxonomy', async () => {
		const db = new SQLite({ type: 'memory' })

		try {
			let caught: unknown
			try {
				await db.select('items; DROP TABLE items')
			} catch (error) {
				caught = error
			}

			expect(caught).toBeInstanceOf(Error)
			expect(isSQLError(caught)).toBe(false)
		} finally {
			db.close()
		}
	})
})
