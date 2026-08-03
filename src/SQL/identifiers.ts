/**
 * SQL identifier hardening.
 *
 * Values are always passed to the drivers as bound parameters (`?`), but SQL
 * identifiers (table / column / field names, ORDER BY keys) cannot be bound and
 * are interpolated into the query string. To prevent SQL injection through those
 * identifiers we validate them against a strict allow-list.
 *
 * Design note (backwards compatibility): this is "validate-only". For any
 * identifier that is already valid the generated SQL is byte-identical to before,
 * so legitimate queries keep working unchanged. Only malicious/unsupported input
 * (quotes, spaces, semicolons, expressions, function calls, ...) is now rejected.
 */

// Per-segment allow-list. Kept intentionally permissive (digits allowed at the
// start) to match the previous SQLite `tableMatch` behaviour and avoid breaking
// existing schemas.
const IDENTIFIER_SEGMENT = /^[A-Za-z0-9_]+$/

/**
 * Validates a single SQL identifier and returns it unchanged.
 *
 * Schema-qualified names are supported (e.g. `schema.table`, `table.column`):
 * each dot-separated segment is validated independently. Expressions, aliases
 * and function calls (e.g. `COUNT(*) AS total`) are intentionally rejected.
 *
 * @throws if `name` is not a safe identifier.
 */
export function assertValidIdentifier(name: unknown, context = 'identifier'): string {
	if (typeof name !== 'string' || name.length === 0) {
		throw new Error(`Invalid ${context}: expected a non-empty string`)
	}

	const segments = name.split('.')
	for (const segment of segments) {
		if (!IDENTIFIER_SEGMENT.test(segment)) {
			throw new Error(`Invalid ${context}: "${name}"`)
		}
	}

	return name
}

/**
 * Validates a list of column identifiers. The `*` wildcard is allowed so the
 * default `select` projection keeps working.
 */
export function assertValidColumns(columns: string[]): string[] {
	for (const column of columns) {
		if (column === '*') {
			continue
		}
		assertValidIdentifier(column, 'column')
	}
	return columns
}

/**
 * Validates the keys of a `sort` map. Directions are derived from the numeric
 * value (`1`/`-1`) by the caller, so only the keys need validation here.
 */
export function assertValidSortKeys(sort: Record<string, unknown>): void {
	for (const key of Object.keys(sort)) {
		assertValidIdentifier(key, 'sort field')
	}
}

const OPERATORS_MAP: Record<string, string> = {
	$eq: '=',
	$gt: '>',
	$gte: '>=',
	$lt: '<',
	$lte: '<=',
	$ne: '!=',
	$in: 'IN',
	$nin: 'NOT IN',
	$like: 'LIKE',
}

type SQLFragment = {
	sql: string
	values: any[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') {
		return false
	}

	const prototype = Object.getPrototypeOf(value)
	return prototype === Object.prototype || prototype === null
}

function isTypedArray(value: unknown): value is Exclude<ArrayBufferView, DataView> {
	return ArrayBuffer.isView(value) && !(value instanceof DataView)
}

function assertBindableValue(value: unknown, context: string): void {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'bigint' ||
		typeof value === 'boolean' ||
		value instanceof Date ||
		isTypedArray(value)
	) {
		return
	}

	throw new Error(`Invalid value for ${context}`)
}

function compileInOperator(
	field: string,
	operator: '$in' | '$nin',
	value: unknown,
): SQLFragment {
	if (!Array.isArray(value)) {
		throw new Error(`Value for ${operator} must be an array`)
	}
	if (value.length === 0) {
		return { sql: operator === '$in' ? '1 = 0' : '1 = 1', values: [] }
	}

	for (const item of value) {
		assertBindableValue(item, operator)
	}

	const includesNull = value.includes(null)
	const nonNullValues = value.filter(item => item !== null)
	if (nonNullValues.length === 0) {
		return {
			sql: `${field} IS ${operator === '$in' ? '' : 'NOT '}NULL`,
			values: [],
		}
	}

	const sqlOperator = OPERATORS_MAP[operator]
	const placeholders = nonNullValues.map(() => '?').join(', ')
	const membership = `${field} ${sqlOperator} (${placeholders})`
	if (!includesNull) {
		return { sql: membership, values: nonNullValues }
	}

	const nullPredicate = `${field} IS ${operator === '$in' ? '' : 'NOT '}NULL`
	const conjunction = operator === '$in' ? 'OR' : 'AND'
	return {
		sql: `(${membership} ${conjunction} ${nullPredicate})`,
		values: nonNullValues,
	}
}

function compileFieldCondition(field: string, condition: unknown): SQLFragment {
	if (condition === undefined) {
		throw new Error(`Invalid value for where field "${field}": undefined`)
	}

	if (!isPlainObject(condition)) {
		assertBindableValue(condition, `where field "${field}"`)
		if (condition === null) {
			return { sql: `${field} IS NULL`, values: [] }
		}
		return { sql: `${field} = ?`, values: [condition] }
	}

	const operators = Object.entries(condition)
	if (operators.length === 0) {
		throw new Error(`Operator object for where field "${field}" must not be empty`)
	}

	const fragments: SQLFragment[] = []
	for (const [operator, value] of operators) {
		if (operator === '$in' || operator === '$nin') {
			fragments.push(compileInOperator(field, operator, value))
			continue
		}

		if (operator === '$between') {
			if (!Array.isArray(value) || value.length !== 2) {
				throw new Error('Value for $between must be an array with exactly two values')
			}
			if (value[0] === null || value[1] === null) {
				throw new Error('Values for $between must not be null')
			}
			assertBindableValue(value[0], '$between')
			assertBindableValue(value[1], '$between')
			fragments.push({
				sql: `${field} BETWEEN ? AND ?`,
				values: [value[0], value[1]],
			})
			continue
		}

		const sqlOperator = OPERATORS_MAP[operator]
		if (!sqlOperator) {
			throw new Error(`Unsupported operator: ${operator}`)
		}

		if ((operator === '$eq' || operator === '$ne') && value === null) {
			fragments.push({
				sql: `${field} IS ${operator === '$eq' ? '' : 'NOT '}NULL`,
				values: [],
			})
			continue
		}

		if (value === null) {
			throw new Error(`Value for ${operator} must not be null`)
		}
		if (operator === '$like' && typeof value !== 'string') {
			throw new Error('Value for $like must be a string')
		}
		assertBindableValue(value, operator)
		fragments.push({ sql: `${field} ${sqlOperator} ?`, values: [value] })
	}

	return {
		sql: fragments.map(fragment => fragment.sql).join(' AND '),
		values: fragments.flatMap(fragment => fragment.values),
	}
}

function compileLogicalOperator(operator: string, value: unknown): SQLFragment {
	if (operator === '$not') {
		if (!isPlainObject(value) || Object.keys(value).length === 0) {
			throw new Error('Value for $not must be a non-empty object')
		}
		const fragment = compileWhereObject(value, false)
		return { sql: `NOT (${fragment.sql})`, values: fragment.values }
	}

	if (operator !== '$and' && operator !== '$or') {
		throw new Error(`Unsupported logical operator: ${operator}`)
	}
	if (!Array.isArray(value) || value.length === 0) {
		throw new Error(`Value for ${operator} must be a non-empty array`)
	}

	const fragments = value.map((item, index) => {
		if (!isPlainObject(item) || Object.keys(item).length === 0) {
			throw new Error(`Item ${index} for ${operator} must be a non-empty object`)
		}
		return compileWhereObject(item, false)
	})
	const sqlOperator = operator === '$and' ? 'AND' : 'OR'
	return {
		sql: `(${fragments.map(fragment => `(${fragment.sql})`).join(` ${sqlOperator} `)})`,
		values: fragments.flatMap(fragment => fragment.values),
	}
}

function compileWhereObject(query: unknown, allowEmpty: boolean): SQLFragment {
	if (!isPlainObject(query)) {
		throw new Error('WHERE clause must be an object')
	}

	const entries = Object.entries(query)
	if (entries.length === 0) {
		if (allowEmpty) {
			return { sql: '', values: [] }
		}
		throw new Error('Logical WHERE group must not be empty')
	}

	const fragments: SQLFragment[] = []
	for (const [field, condition] of entries) {
		if (field.startsWith('$')) {
			fragments.push(compileLogicalOperator(field, condition))
			continue
		}

		assertValidIdentifier(field, 'where field')
		fragments.push(compileFieldCondition(field, condition))
	}

	return {
		sql: fragments.map(fragment => fragment.sql).join(' AND '),
		values: fragments.flatMap(fragment => fragment.values),
	}
}

/**
 * Translates a Mongo-style query object into a parameterized SQL `WHERE` clause.
 *
 * Field names are validated as identifiers (they are interpolated), while
 * compared values are returned as bound parameters. Logical groups are compiled
 * recursively and null comparisons use SQL's `IS NULL`/`IS NOT NULL` semantics.
 */
export function translateMongoJsonToSql(query: object): {
	whereStatement: string
	values: any[]
} {
	const fragment = compileWhereObject(query, true)
	return {
		whereStatement: fragment.sql ? `WHERE ${fragment.sql}` : '',
		values: fragment.values,
	}
}
