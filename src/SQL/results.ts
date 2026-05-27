/**
 * Driver result normalization.
 *
 * Write operations return very different shapes depending on the driver:
 *  - sqlite (`bun:sqlite`): `{ changes, lastInsertRowid }`
 *  - postgres (`Bun.SQL`):  an array of `RETURNING` rows, plus a `count` property
 *  - mysql (`Bun.SQL`):     an OkPacket-like `{ affectedRows, insertId }`
 *
 * Instead of guessing inside each method with `as any`, these helpers probe the
 * known fields in a deterministic order and return stable, typed values.
 */

/**
 * Number of rows affected by an INSERT/UPDATE/DELETE. Returns `0` when the
 * driver does not expose a usable count.
 */
export function extractAffectedRows(result: unknown): number {
	if (result === null || result === undefined) {
		return 0
	}

	const record = result as Record<string, unknown>

	if (typeof record.changes === 'number' || typeof record.changes === 'bigint') {
		return Number(record.changes) // sqlite
	}
	if (typeof record.affectedRows === 'number') {
		return record.affectedRows // mysql
	}
	if (typeof record.rowCount === 'number') {
		return record.rowCount // pg-style
	}
	if (typeof record.count === 'number') {
		return record.count // Bun.SQL exposes `count`
	}
	if (Array.isArray(result)) {
		return result.length // RETURNING rows
	}

	return 0
}

/**
 * Last inserted row id, when the driver/statement provides one. Returns
 * `undefined` when it cannot be determined (e.g. tables without an `id` PK).
 */
export function extractLastInsertId(result: unknown): number | string | undefined {
	if (result === null || result === undefined) {
		return undefined
	}

	const record = result as Record<string, unknown>

	if (record.lastInsertRowid !== undefined && record.lastInsertRowid !== null) {
		return typeof record.lastInsertRowid === 'bigint' ?
				Number(record.lastInsertRowid)
			:	(record.lastInsertRowid as number | string) // sqlite
	}
	if (record.insertId !== undefined && record.insertId !== null) {
		return record.insertId as number | string // mysql
	}
	if (Array.isArray(result) && result.length > 0) {
		const row = result[0] as Record<string, unknown>
		const id = row.id ?? row.ID // postgres RETURNING *
		return id as number | string | undefined
	}

	return undefined
}
