import { describe, expect, test } from 'bun:test'
import { SQL, SQLError, isSQLError } from './index'

function makeDb(): SQL {
	// In-memory SQLite — no external services required.
	return new SQL({ type: 'sqlite', url: ':memory:' })
}

function makeDialectQueryRecorder(type: 'mysql' | 'postgres' | 'sqlite') {
	const db = Object.create(SQL.prototype) as SQL
	const queries: string[] = []

	Object.defineProperties(db, {
		dbType: { value: type },
		executeQuery: {
			value: async (query: string) => {
				queries.push(query)
				return []
			},
		},
	})

	return { db, queries }
}

describe('SQL (sqlite) — legitimate usage is unchanged', () => {
	test('create / insert / select / count / update / delete', async () => {
		const db = makeDb()

		await db.createTable('items', {
			id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
			name: 'TEXT',
			category: 'TEXT',
		})

		const inserted = await db.insert('items', { name: 'a', category: 'A' })
		expect(inserted?.changes).toBe(1)
		expect(inserted?.affectedRows).toBe(1)
		expect(inserted?.lastInsertRowId).toBe(1)
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

	test('executes null, nested logical, range and empty-membership filters', async () => {
		const db = makeDb()

		await db.createTable('filter_items', {
			id: 'INTEGER PRIMARY KEY',
			status: 'TEXT',
			deleted_at: 'TEXT',
			score: 'INTEGER',
		})
		await db.insert('filter_items', {
			id: 1,
			status: 'active',
			deleted_at: null,
			score: 5,
		})
		await db.insert('filter_items', {
			id: 2,
			status: 'pending',
			deleted_at: null,
			score: 15,
		})
		await db.insert('filter_items', {
			id: 3,
			status: 'active',
			deleted_at: '2026-08-03T12:00:00.000Z',
			score: 15,
		})
		await db.insert('filter_items', {
			id: 4,
			status: 'blocked',
			deleted_at: null,
			score: 25,
		})

		const visible = await db.select<{ id: number }>({
			tableName: 'filter_items',
			columns: ['id'],
			whereClause: {
				deleted_at: null,
				$or: [
					{ status: 'active' },
					{
						$and: [{ score: { $between: [10, 20] } }, { $not: { status: 'blocked' } }],
					},
				],
			},
			sort: { id: 1 },
		})
		expect(visible?.map(row => row.id)).toEqual([1, 2])

		const noRows = await db.select<{ id: number }>({
			tableName: 'filter_items',
			columns: ['id'],
			whereClause: { id: { $in: [] } },
		})
		expect(noRows).toEqual([])
		expect(
			await db.count({ tableName: 'filter_items', whereClause: { id: { $nin: [] } } }),
		).toBe(4)
		expect(
			await db.count({
				tableName: 'filter_items',
				whereClause: { deleted_at: { $in: [null] } },
			}),
		).toBe(3)
	})
})

describe('SQL (sqlite) — schema and raw-query wrappers', () => {
	test('alterTable and dropColumn apply trusted DDL clauses', async () => {
		const db = makeDb()

		await db.createTable('schema_items', {
			id: 'INTEGER PRIMARY KEY',
			obsolete: 'TEXT',
		})
		await db.alterTable('schema_items', [
			'ADD COLUMN category TEXT',
			'ADD COLUMN rank INTEGER',
		])
		await db.dropColumn('schema_items', 'obsolete')

		const schema = await db.getTableSchema('schema_items')
		expect(schema.map(column => column.name)).toEqual(['id', 'category', 'rank'])
	})

	test('createIndex supports custom, unique, compound, ordered and partial indexes', async () => {
		const db = makeDb()

		await db.createTable('indexed_items', {
			id: 'INTEGER PRIMARY KEY',
			category: 'TEXT',
			rank: 'INTEGER',
		})
		await db.createIndex(
			'indexed_items',
			[
				{ name: 'category', order: 'asc' },
				{ name: 'rank', order: 'DESC' },
			],
			{
				name: 'idx_indexed_items_lookup',
				unique: true,
				where: 'rank > 0',
			},
		)

		const indexes = await db.executeRaw<Array<{ name: string; sql: string }>>(
			'SELECT name, sql FROM sqlite_master WHERE type = ? AND name = ?',
			['index', 'idx_indexed_items_lookup'],
		)
		expect(indexes).toHaveLength(1)
		expect(indexes[0]?.sql).toBe(
			'CREATE UNIQUE INDEX idx_indexed_items_lookup ON indexed_items (category ASC, rank DESC) WHERE rank > 0',
		)
	})

	test('the legacy createIndex(table, column) signature remains idempotent', async () => {
		const db = makeDb()

		await db.createTable('legacy_indexes', { id: 'INTEGER', category: 'TEXT' })
		await db.createIndex('legacy_indexes', 'category')
		await db.createIndex('legacy_indexes', 'category')

		const indexes = await db.executeRaw<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_legacy_indexes_category'",
		)
		expect(indexes).toEqual([{ name: 'idx_legacy_indexes_category' }])
	})

	test('dropIndex removes a named SQLite index and defaults to idempotent', async () => {
		const db = makeDb()

		await db.createTable('drop_index_items', { id: 'INTEGER', category: 'TEXT' })
		await db.createIndex('drop_index_items', 'category', {
			name: 'idx_drop_index_items_category',
		})
		await db.dropIndex('drop_index_items', 'idx_drop_index_items_category')
		await db.dropIndex('drop_index_items', 'idx_drop_index_items_category')

		const indexes = await db.executeRaw<Array<{ name: string }>>(
			"SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?",
			['idx_drop_index_items_category'],
		)
		expect(indexes).toEqual([])
	})

	test('dropIndex emits adapter-specific SQL and rejects unsupported options', async () => {
		const postgres = makeDialectQueryRecorder('postgres')
		await postgres.db.dropIndex('users', 'uq_users_email_live', {
			ifExists: true,
			concurrently: true,
		})
		expect(postgres.queries).toEqual([
			'DROP INDEX CONCURRENTLY IF EXISTS uq_users_email_live',
		])

		const mysql = makeDialectQueryRecorder('mysql')
		await mysql.db.dropIndex('users', 'uq_users_email_live')
		expect(mysql.queries).toEqual(['DROP INDEX uq_users_email_live ON users'])
		await expect(
			mysql.db.dropIndex('users', 'uq_users_email_live', { ifExists: true }),
		).rejects.toThrow('MySQL DROP INDEX does not support IF EXISTS')

		const sqlite = makeDialectQueryRecorder('sqlite')
		await expect(
			sqlite.db.dropIndex('users', 'uq_users_email_live', { concurrently: true }),
		).rejects.toThrow('CONCURRENTLY is only supported for PostgreSQL indexes')
		await expect(
			sqlite.db.dropIndex('users', 'unsafe; DROP TABLE users'),
		).rejects.toThrow()
	})

	test('executeRaw bypasses helpers while still forwarding bound values', async () => {
		const db = makeDb()

		await db.executeRaw('CREATE TABLE raw_items (id INTEGER PRIMARY KEY, name TEXT)')
		await db.executeRaw('INSERT INTO raw_items (id, name) VALUES (?, ?)', [1, 'raw'])
		const rows = await db.executeRaw<Array<{ id: number; name: string }>>(
			'SELECT id, name FROM raw_items WHERE id = ?',
			[1],
		)

		expect(rows).toEqual([{ id: 1, name: 'raw' }])
		await expect(db.executeRaw('   ')).rejects.toThrow('non-empty string')
	})
})

describe('SQL (sqlite) — normalized driver errors', () => {
	test('classifies a unique violation and preserves the native error', async () => {
		const db = makeDb()

		await db.createTable('error_items', {
			id: 'INTEGER PRIMARY KEY',
			email: 'TEXT UNIQUE',
		})
		await db.insert('error_items', { id: 1, email: 'operator@stock42.com' })

		let caught: unknown
		try {
			await db.insert('error_items', { id: 2, email: 'operator@stock42.com' })
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
		expect(caught.cause).toBeInstanceOf(Bun.SQL.SQLiteError)
		expect('query' in caught).toBe(false)
		expect('params' in caught).toBe(false)
	})

	test('uses unknown for unmapped raw and structured query errors', async () => {
		const db = makeDb()

		for (const execute of [
			() => db.executeRaw('SELECT * FROM missing_raw_table'),
			() => db.select({ tableName: 'missing_structured_table' }),
		]) {
			let caught: unknown
			try {
				await execute()
			} catch (error) {
				caught = error
			}

			expect(isSQLError(caught, 'unknown')).toBe(true)
			expect(caught).toBeInstanceOf(SQLError)
			if (caught instanceof SQLError) {
				expect(caught.nativeCode).toBe('SQLITE_ERROR')
				expect(caught.errno).toBe(1)
				expect(caught.message).toContain('no such table')
			}
		}
	})

	test('does not wrap validation or transaction callback errors', async () => {
		const db = makeDb()
		const callbackError = new Error('application rollback')
		let caught: unknown

		try {
			await db.begin(async () => {
				await Promise.resolve()
				throw callbackError
			})
		} catch (error) {
			caught = error
		}

		expect(caught).toBe(callbackError)
		expect(isSQLError(caught)).toBe(false)
		await expect(db.executeRaw('   ')).rejects.toThrow('non-empty string')
	})
})

describe('SQL (sqlite) — transactions', () => {
	test('begin commits and exposes the S42 SQL wrapper inside the callback', async () => {
		const db = makeDb()

		await db.createTable('transaction_items', {
			id: 'INTEGER PRIMARY KEY',
			name: 'TEXT',
		})
		const result = await db.begin(async transaction => {
			await transaction.insert('transaction_items', { id: 1, name: 'committed' })
			return transaction.count({ tableName: 'transaction_items' })
		})

		expect(result).toBe(1)
		expect(await db.count({ tableName: 'transaction_items' })).toBe(1)
	})

	test('begin rolls back when the callback throws', async () => {
		const db = makeDb()

		await db.createTable('rollback_items', {
			id: 'INTEGER PRIMARY KEY',
			name: 'TEXT',
		})
		await expect(
			db.begin(async transaction => {
				await transaction.insert('rollback_items', { id: 1, name: 'rolled-back' })
				throw new Error('rollback transaction')
			}),
		).rejects.toThrow('rollback transaction')
		expect(await db.count({ tableName: 'rollback_items' })).toBe(0)
	})

	test('transaction resolves pipelined wrapper calls', async () => {
		const db = makeDb()

		await db.createTable('pipeline_items', {
			id: 'INTEGER PRIMARY KEY',
			name: 'TEXT',
		})
		const results = await db.transaction(transaction => [
			transaction.insert('pipeline_items', { id: 1, name: 'one' }),
			transaction.insert('pipeline_items', { id: 2, name: 'two' }),
		])

		expect(results.map(result => result?.changes)).toEqual([1, 1])
		expect(await db.count({ tableName: 'pipeline_items' })).toBe(2)
	})

	test('savepoint rolls back only its own work when the error is handled', async () => {
		const db = makeDb()

		await db.createTable('savepoint_items', {
			id: 'INTEGER PRIMARY KEY',
			name: 'TEXT',
		})
		await db.begin(async transaction => {
			await transaction.insert('savepoint_items', { id: 1, name: 'before' })
			try {
				await transaction.savepoint('optional_item', async savepoint => {
					await savepoint.insert('savepoint_items', { id: 2, name: 'discarded' })
					throw new Error('rollback savepoint')
				})
			} catch (error) {
				expect((error as Error).message).toBe('rollback savepoint')
			}
			await transaction.insert('savepoint_items', { id: 3, name: 'after' })
		})

		const rows = await db.select<{ id: number }>({
			tableName: 'savepoint_items',
			columns: ['id'],
			sort: { id: 1 },
		})
		expect(rows?.map(row => row.id)).toEqual([1, 3])
		await expect(db.savepoint(async () => undefined)).rejects.toThrow(
			'inside a transaction callback',
		)
	})

	test('distributed transaction wrappers normalize unsupported adapter errors', async () => {
		const db = makeDb()

		for (const execute of [
			() => db.beginDistributed('tx_sqlite', async () => undefined),
			() => db.distributed('tx_sqlite', async () => undefined),
			() => db.commitDistributed('tx_sqlite'),
			() => db.rollbackDistributed('tx_sqlite'),
		]) {
			let caught: unknown
			try {
				await execute()
			} catch (error) {
				caught = error
			}

			expect(isSQLError(caught, 'unknown')).toBe(true)
			expect(caught).toBeInstanceOf(SQLError)
		}
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
