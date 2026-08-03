import { describe, expect, test } from 'bun:test'
import {
	assertValidColumns,
	assertValidIdentifier,
	assertValidSortKeys,
	translateMongoJsonToSql,
} from './identifiers'

describe('assertValidIdentifier', () => {
	test('accepts simple identifiers', () => {
		expect(assertValidIdentifier('users')).toBe('users')
		expect(assertValidIdentifier('user_id')).toBe('user_id')
		expect(assertValidIdentifier('table42')).toBe('table42')
	})

	test('accepts schema-qualified names', () => {
		expect(assertValidIdentifier('public.users')).toBe('public.users')
		expect(assertValidIdentifier('users.id')).toBe('users.id')
	})

	test('rejects injection attempts and non-identifiers', () => {
		expect(() => assertValidIdentifier('users; DROP TABLE users')).toThrow()
		expect(() => assertValidIdentifier('users WHERE 1=1')).toThrow()
		expect(() => assertValidIdentifier('"users"')).toThrow()
		expect(() => assertValidIdentifier('users--')).toThrow()
		expect(() => assertValidIdentifier('')).toThrow()
		expect(() => assertValidIdentifier(123 as unknown)).toThrow()
	})
})

describe('assertValidColumns', () => {
	test('allows the * wildcard and simple columns', () => {
		expect(() => assertValidColumns(['*'])).not.toThrow()
		expect(() => assertValidColumns(['id', 'name', 'created_at'])).not.toThrow()
	})

	test('rejects expressions, aliases and injection', () => {
		expect(() => assertValidColumns(['COUNT(*) as total'])).toThrow()
		expect(() => assertValidColumns(['id, (SELECT secret FROM users)'])).toThrow()
		expect(() => assertValidColumns(['name AS n'])).toThrow()
	})
})

describe('assertValidSortKeys', () => {
	test('accepts identifier keys regardless of direction', () => {
		expect(() => assertValidSortKeys({ id: 1, created_at: -1 })).not.toThrow()
	})

	test('rejects malicious keys', () => {
		expect(() => assertValidSortKeys({ 'id; DROP TABLE x': 1 })).toThrow()
	})
})

describe('translateMongoJsonToSql', () => {
	test('parameterizes values and keeps identifiers byte-identical', () => {
		const { whereStatement, values } = translateMongoJsonToSql({
			category: 'A',
			price: { $gte: 100 },
		})
		expect(whereStatement).toBe('WHERE category = ? AND price >= ?')
		expect(values).toEqual(['A', 100])
	})

	test('supports $in with placeholders', () => {
		const { whereStatement, values } = translateMongoJsonToSql({
			status: { $in: ['a', 'b'] },
		})
		expect(whereStatement).toBe('WHERE status IN (?, ?)')
		expect(values).toEqual(['a', 'b'])
	})

	test('translates direct and operator null comparisons', () => {
		const { whereStatement, values } = translateMongoJsonToSql({
			deleted_at: null,
			archived_at: { $eq: null },
			restored_at: { $ne: null },
		})

		expect(whereStatement).toBe(
			'WHERE deleted_at IS NULL AND archived_at IS NULL AND restored_at IS NOT NULL',
		)
		expect(values).toEqual([])
	})

	test('supports recursive logical groups with deterministic parameter order', () => {
		const availableAt = new Date('2026-08-03T12:00:00.000Z')
		const { whereStatement, values } = translateMongoJsonToSql({
			tenant_id: 'tenant-1',
			deleted_at: null,
			$or: [
				{ status: 'active' },
				{ status: 'pending', available_at: { $lte: availableAt } },
			],
		})

		expect(whereStatement).toBe(
			'WHERE tenant_id = ? AND deleted_at IS NULL AND ((status = ?) OR (status = ? AND available_at <= ?))',
		)
		expect(values).toEqual(['tenant-1', 'active', 'pending', availableAt])
	})

	test('supports explicit $and, $not and inclusive $between', () => {
		const { whereStatement, values } = translateMongoJsonToSql({
			$and: [{ score: { $between: [10, 20] } }, { $not: { status: 'blocked' } }],
		})

		expect(whereStatement).toBe('WHERE ((score BETWEEN ? AND ?) AND (NOT (status = ?)))')
		expect(values).toEqual([10, 20, 'blocked'])
	})

	test('normalizes empty and null-containing membership arrays', () => {
		expect(translateMongoJsonToSql({ id: { $in: [] } })).toEqual({
			whereStatement: 'WHERE 1 = 0',
			values: [],
		})
		expect(translateMongoJsonToSql({ id: { $nin: [] } })).toEqual({
			whereStatement: 'WHERE 1 = 1',
			values: [],
		})
		expect(translateMongoJsonToSql({ status: { $in: ['active', null] } })).toEqual({
			whereStatement: 'WHERE (status IN (?) OR status IS NULL)',
			values: ['active'],
		})
		expect(translateMongoJsonToSql({ status: { $nin: ['blocked', null] } })).toEqual({
			whereStatement: 'WHERE (status NOT IN (?) AND status IS NOT NULL)',
			values: ['blocked'],
		})
		expect(translateMongoJsonToSql({ status: { $in: [null] } })).toEqual({
			whereStatement: 'WHERE status IS NULL',
			values: [],
		})
	})

	test('treats Date and typed-array values as scalar bindings', () => {
		const createdAt = new Date('2026-08-03T12:00:00.000Z')
		const checksum = new Uint8Array([1, 2, 3])
		const { whereStatement, values } = translateMongoJsonToSql({
			created_at: createdAt,
			checksum,
		})

		expect(whereStatement).toBe('WHERE created_at = ? AND checksum = ?')
		expect(values).toEqual([createdAt, checksum])
	})

	test('keeps an empty top-level clause backwards compatible', () => {
		expect(translateMongoJsonToSql({})).toEqual({ whereStatement: '', values: [] })
	})

	test('rejects malicious field names', () => {
		expect(() => translateMongoJsonToSql({ '1=1; DROP TABLE x': 'y' })).toThrow()
	})

	test('rejects unsupported operators', () => {
		expect(() => translateMongoJsonToSql({ id: { $regex: '.*' } })).toThrow()
	})

	test('rejects invalid logical groups and nested malicious fields', () => {
		expect(() => translateMongoJsonToSql({ $or: [] })).toThrow('non-empty array')
		expect(() => translateMongoJsonToSql({ $and: [{}] })).toThrow('non-empty object')
		expect(() => translateMongoJsonToSql({ $not: {} })).toThrow('non-empty object')
		expect(() => translateMongoJsonToSql({ $nor: [{ id: 1 }] })).toThrow(
			'Unsupported logical operator',
		)
		expect(() =>
			translateMongoJsonToSql({ $or: [{ 'id; DROP TABLE users': 1 }] }),
		).toThrow()
	})

	test('rejects invalid operator operands instead of dropping predicates', () => {
		expect(() => translateMongoJsonToSql({ id: {} })).toThrow('must not be empty')
		expect(() => translateMongoJsonToSql({ id: undefined })).toThrow('undefined')
		expect(() => translateMongoJsonToSql({ id: [1, 2] })).toThrow('Invalid value')
		expect(() => translateMongoJsonToSql({ score: { $between: [1] } })).toThrow(
			'exactly two values',
		)
		expect(() => translateMongoJsonToSql({ score: { $between: [null, 10] } })).toThrow(
			'must not be null',
		)
		expect(() => translateMongoJsonToSql({ score: { $gt: null } })).toThrow(
			'must not be null',
		)
		expect(() => translateMongoJsonToSql({ name: { $like: 42 } })).toThrow(
			'must be a string',
		)
		expect(() => translateMongoJsonToSql({ name: { $ilike: 'a%' } })).toThrow(
			'Unsupported operator',
		)
	})
})
