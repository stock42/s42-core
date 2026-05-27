import { describe, expect, test } from 'bun:test'
import { extractAffectedRows, extractLastInsertId } from './results'

describe('extractAffectedRows', () => {
	test('sqlite shape ({ changes })', () => {
		expect(extractAffectedRows({ changes: 3, lastInsertRowid: 10 })).toBe(3)
		expect(extractAffectedRows({ changes: 2n })).toBe(2)
	})

	test('mysql shape ({ affectedRows })', () => {
		expect(extractAffectedRows({ affectedRows: 5, insertId: 42 })).toBe(5)
	})

	test('postgres shapes (rowCount / count / RETURNING array)', () => {
		expect(extractAffectedRows({ rowCount: 4 })).toBe(4)
		expect(extractAffectedRows({ count: 7 })).toBe(7)
		expect(extractAffectedRows([{ id: 1 }, { id: 2 }])).toBe(2)
	})

	test('unknown / empty shapes return 0', () => {
		expect(extractAffectedRows(null)).toBe(0)
		expect(extractAffectedRows(undefined)).toBe(0)
		expect(extractAffectedRows({})).toBe(0)
		expect(extractAffectedRows([])).toBe(0)
	})
})

describe('extractLastInsertId', () => {
	test('sqlite ({ lastInsertRowid })', () => {
		expect(extractLastInsertId({ lastInsertRowid: 10, changes: 1 })).toBe(10)
		expect(extractLastInsertId({ lastInsertRowid: 9007199254740993n })).toBe(
			Number(9007199254740993n),
		)
	})

	test('mysql ({ insertId })', () => {
		expect(extractLastInsertId({ insertId: 42, affectedRows: 1 })).toBe(42)
	})

	test('postgres (RETURNING * row with id/ID)', () => {
		expect(extractLastInsertId([{ id: 99, name: 'x' }])).toBe(99)
		expect(extractLastInsertId([{ ID: 7 }])).toBe(7)
		expect(extractLastInsertId([{ name: 'no-pk' }])).toBeUndefined()
	})

	test('unknown / empty shapes return undefined', () => {
		expect(extractLastInsertId(null)).toBeUndefined()
		expect(extractLastInsertId({})).toBeUndefined()
		expect(extractLastInsertId([])).toBeUndefined()
	})
})
