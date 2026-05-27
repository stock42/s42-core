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

	test('rejects malicious field names', () => {
		expect(() => translateMongoJsonToSql({ '1=1; DROP TABLE x': 'y' })).toThrow()
	})

	test('rejects unsupported operators', () => {
		expect(() => translateMongoJsonToSql({ id: { $regex: '.*' } })).toThrow()
	})
})
