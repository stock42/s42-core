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

const OPERATORS_MAP: { [key: string]: string } = {
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

/**
 * Translates a Mongo-style query object into a parameterized SQL `WHERE` clause.
 *
 * Field names are validated as identifiers (they are interpolated), while the
 * compared values are always returned as bound parameters.
 */
export function translateMongoJsonToSql(query: object): {
	whereStatement: string
	values: any[]
} {
	const whereClauses: string[] = []
	const values: any[] = []

	for (const [field, condition] of Object.entries(query)) {
		assertValidIdentifier(field, 'where field')

		if (typeof condition === 'object' && condition !== null) {
			for (const [operator, value] of Object.entries(condition)) {
				const sqlOperator = OPERATORS_MAP[operator]
				if (!sqlOperator) {
					throw new Error(`Unsupported operator: ${operator}`)
				}

				if (operator === '$in' || operator === '$nin') {
					if (!Array.isArray(value)) {
						throw new Error(`Value for ${operator} must be an array`)
					}
					const placeholders = value.map(() => '?').join(', ')
					whereClauses.push(`${field} ${sqlOperator} (${placeholders})`)
					values.push(...value)
				} else {
					whereClauses.push(`${field} ${sqlOperator} ?`)
					values.push(value)
				}
			}
		} else {
			// If the condition is a direct value, assume equality
			whereClauses.push(`${field} = ?`)
			values.push(condition)
		}
	}

	const whereStatement =
		whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
	return { whereStatement, values }
}
