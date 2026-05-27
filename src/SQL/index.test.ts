import { describe, expect, test } from 'bun:test'
import { SQL } from './index'

function makeDb(): SQL {
	// In-memory SQLite — no external services required.
	return new SQL({ type: 'sqlite', url: ':memory:' })
}

describe('SQL (sqlite) — legitimate usage is unchanged', () => {
	test('create / insert / select / count / update / delete', async () => {
		const db = makeDb()

		await db.createTable('items', {
			id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
			name: 'TEXT',
			category: 'TEXT',
		})

		await db.insert('items', { name: 'a', category: 'A' })
		await db.insert('items', { name: 'b', category: 'A' })
		await db.insert('items', { name: 'c', category: 'B' })

		const all = await db.select<{ id: number; name: string }>({ tableName: 'items' })
		expect(all?.length).toBe(3)

		const filtered = await db.select<{ name: string }>({
			tableName: 'items',
			columns: ['name'],
			whereClause: { category: 'A' },
			sort: { id: 1 },
		})
		expect(filtered?.map(row => row.name)).toEqual(['a', 'b'])

		expect(await db.count({ tableName: 'items' })).toBe(3)
		expect(await db.count({ tableName: 'items', whereClause: { category: 'A' } })).toBe(2)

		const updated = await db.update({
			tableName: 'items',
			whereClause: { name: 'a' },
			data: { category: 'Z' },
		})
		expect(updated).toBe(1)

		const deleted = await db.delete('items', { category: 'B' })
		expect(deleted).toBe(1)
	})
})

describe('SQL (sqlite) — identifier validation blocks injection', () => {
	test('malicious table name throws', async () => {
		const db = makeDb()
		await expect(db.select({ tableName: 'items; DROP TABLE items' })).rejects.toThrow()
	})

	test('malicious column projection throws', async () => {
		const db = makeDb()
		await db.createTable('t', { id: 'INTEGER', name: 'TEXT' })
		await expect(db.select({ tableName: 't', columns: ['(SELECT 1)'] })).rejects.toThrow()
	})

	test('malicious sort key throws', async () => {
		const db = makeDb()
		await db.createTable('t2', { id: 'INTEGER' })
		await expect(
			db.select({ tableName: 't2', sort: { 'id; DROP TABLE t2': 1 } }),
		).rejects.toThrow()
	})

	test('malicious where field throws', async () => {
		const db = makeDb()
		await db.createTable('t3', { id: 'INTEGER' })
		await expect(
			db.count({ tableName: 't3', whereClause: { 'id = 1 OR 1=1': 1 } }),
		).rejects.toThrow()
	})

	test('malicious insert column throws', async () => {
		const db = makeDb()
		await db.createTable('t4', { id: 'INTEGER', name: 'TEXT' })
		await expect(db.insert('t4', { 'name) VALUES (1); --': 'x' })).rejects.toThrow()
	})
})
