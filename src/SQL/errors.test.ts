import { describe, expect, test } from 'bun:test'
import { SQL as BunSQL } from 'bun'
import { SQLError, isSQLError, normalizeSQLError, type SQLErrorCode } from './errors'

function expectSQLError(
	error: unknown,
	expected: {
		code: SQLErrorCode
		dialect: 'mysql' | 'postgres' | 'sqlite'
		nativeCode?: string | number
		errno?: string | number
		sqlstate?: string
	},
): SQLError {
	expect(error).toBeInstanceOf(SQLError)
	if (!(error instanceof SQLError)) {
		throw new Error('Expected a normalized SQLError')
	}
	expect(error).toMatchObject(expected)
	return error
}

describe('SQLError normalization', () => {
	test('maps PostgreSQL SQLSTATE and preserves native metadata', () => {
		const original = new BunSQL.PostgresError('duplicate email', {
			code: 'ERR_POSTGRES_SERVER_ERROR',
			errno: '23505',
			constraint: 'users_email_key',
		})
		const error = expectSQLError(normalizeSQLError(original, 'postgres'), {
			code: 'unique_violation',
			dialect: 'postgres',
			nativeCode: 'ERR_POSTGRES_SERVER_ERROR',
			errno: '23505',
			sqlstate: '23505',
		})

		expect(error.message).toBe('duplicate email')
		expect(error.constraint).toBe('users_email_key')
		expect(error.cause).toBe(original)
	})

	test('maps the supported PostgreSQL categories', () => {
		const cases: Array<[string, SQLErrorCode]> = [
			['23503', 'foreign_key_violation'],
			['23502', 'not_null_violation'],
			['23514', 'check_violation'],
			['42701', 'duplicate_column'],
			['42P07', 'duplicate_table'],
			['40001', 'serialization_failure'],
			['40P01', 'deadlock_detected'],
			['08006', 'connection_failure'],
		]

		for (const [errno, code] of cases) {
			const original = new BunSQL.PostgresError(code, {
				code: 'ERR_POSTGRES_SERVER_ERROR',
				errno,
			})
			expectSQLError(normalizeSQLError(original, 'postgres'), {
				code,
				dialect: 'postgres',
				nativeCode: 'ERR_POSTGRES_SERVER_ERROR',
				errno,
				sqlstate: errno,
			})
		}
	})

	test('maps MySQL errno and SQLSTATE values', () => {
		const cases: Array<[number, string, string, SQLErrorCode]> = [
			[1062, 'ER_DUP_ENTRY', '23000', 'unique_violation'],
			[1452, 'ER_NO_REFERENCED_ROW_2', '23000', 'foreign_key_violation'],
			[1048, 'ER_BAD_NULL_ERROR', '23000', 'not_null_violation'],
			[3819, 'ER_CHECK_CONSTRAINT_VIOLATED', 'HY000', 'check_violation'],
			[1060, 'ER_DUP_FIELDNAME', '42S21', 'duplicate_column'],
			[1050, 'ER_TABLE_EXISTS_ERROR', '42S01', 'duplicate_table'],
			[1213, 'ER_LOCK_DEADLOCK', '40001', 'deadlock_detected'],
			[1205, 'ER_LOCK_WAIT_TIMEOUT', 'HY000', 'database_busy'],
		]

		for (const [errno, nativeCode, sqlstate, code] of cases) {
			const original = new BunSQL.MySQLError(code, {
				code: nativeCode,
				errno,
				sqlState: sqlstate,
			})
			expectSQLError(normalizeSQLError(original, 'mysql'), {
				code,
				dialect: 'mysql',
				nativeCode,
				errno,
				sqlstate,
			})
		}
	})

	test('maps SQLite extended result codes', () => {
		const cases: Array<[number, string, SQLErrorCode]> = [
			[2067, 'SQLITE_CONSTRAINT_UNIQUE', 'unique_violation'],
			[1555, 'SQLITE_CONSTRAINT_PRIMARYKEY', 'unique_violation'],
			[787, 'SQLITE_CONSTRAINT_FOREIGNKEY', 'foreign_key_violation'],
			[1299, 'SQLITE_CONSTRAINT_NOTNULL', 'not_null_violation'],
			[275, 'SQLITE_CONSTRAINT_CHECK', 'check_violation'],
			[517, 'SQLITE_BUSY_SNAPSHOT', 'serialization_failure'],
			[5, 'SQLITE_BUSY', 'database_busy'],
			[14, 'SQLITE_CANTOPEN', 'connection_failure'],
		]

		for (const [errno, nativeCode, code] of cases) {
			const original = new BunSQL.SQLiteError(code, {
				code: nativeCode,
				errno,
			})
			expectSQLError(normalizeSQLError(original, 'sqlite'), {
				code,
				dialect: 'sqlite',
				nativeCode,
				errno,
			})
		}
	})

	test('uses unknown without inspecting SQLite DDL messages', () => {
		const original = new BunSQL.SQLiteError('duplicate column name: email', {
			code: 'SQLITE_ERROR',
			errno: 1,
		})
		const error = expectSQLError(normalizeSQLError(original, 'sqlite'), {
			code: 'unknown',
			dialect: 'sqlite',
			nativeCode: 'SQLITE_ERROR',
			errno: 1,
		})

		expect(error.message).toBe('duplicate column name: email')
		expect(error.cause).toBe(original)
	})

	test('preserves non-driver errors and exposes a category predicate', () => {
		const applicationError = new Error('application failure')
		expect(normalizeSQLError(applicationError, 'postgres')).toBe(applicationError)

		const original = new BunSQL.PostgresError('duplicate', {
			code: 'ERR_POSTGRES_SERVER_ERROR',
			errno: '23505',
		})
		const error = normalizeSQLError(original, 'postgres')

		expect(isSQLError(error)).toBe(true)
		expect(isSQLError(error, 'unique_violation')).toBe(true)
		expect(isSQLError(error, 'foreign_key_violation')).toBe(false)
		expect(isSQLError(applicationError)).toBe(false)
	})
})
