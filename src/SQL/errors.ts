import { SQL as BunSQL } from 'bun'
import { SQLiteError as BunSQLiteError } from 'bun:sqlite'

export type SQLDialect = 'mysql' | 'postgres' | 'sqlite'

/** Stable, cross-adapter categories exposed by S42-Core. */
export type SQLErrorCode =
	| 'unique_violation'
	| 'foreign_key_violation'
	| 'not_null_violation'
	| 'check_violation'
	| 'duplicate_column'
	| 'duplicate_table'
	| 'serialization_failure'
	| 'deadlock_detected'
	| 'connection_failure'
	| 'database_busy'
	| 'unknown'

type NativeSQLError = Error & {
	code?: unknown
	errno?: unknown
	sqlState?: unknown
	constraint?: unknown
}

const POSTGRES_SQLSTATE_CODES: Readonly<Record<string, SQLErrorCode>> = {
	'23505': 'unique_violation',
	'23503': 'foreign_key_violation',
	'23502': 'not_null_violation',
	'23514': 'check_violation',
	'42701': 'duplicate_column',
	'42P07': 'duplicate_table',
	'40001': 'serialization_failure',
	'40P01': 'deadlock_detected',
}

const MYSQL_ERRNO_CODES: Readonly<Record<string, SQLErrorCode>> = {
	'1062': 'unique_violation',
	'1451': 'foreign_key_violation',
	'1452': 'foreign_key_violation',
	'1048': 'not_null_violation',
	'3819': 'check_violation',
	'1060': 'duplicate_column',
	'1050': 'duplicate_table',
	'1213': 'deadlock_detected',
	'1205': 'database_busy',
	'1053': 'connection_failure',
	'2002': 'connection_failure',
	'2003': 'connection_failure',
	'2006': 'connection_failure',
	'2013': 'connection_failure',
}

const MYSQL_NATIVE_CODES: Readonly<Record<string, SQLErrorCode>> = {
	ER_DUP_ENTRY: 'unique_violation',
	ER_ROW_IS_REFERENCED_2: 'foreign_key_violation',
	ER_NO_REFERENCED_ROW_2: 'foreign_key_violation',
	ER_BAD_NULL_ERROR: 'not_null_violation',
	ER_CHECK_CONSTRAINT_VIOLATED: 'check_violation',
	ER_DUP_FIELDNAME: 'duplicate_column',
	ER_TABLE_EXISTS_ERROR: 'duplicate_table',
	ER_LOCK_DEADLOCK: 'deadlock_detected',
	ER_LOCK_WAIT_TIMEOUT: 'database_busy',
	ER_SERVER_SHUTDOWN: 'connection_failure',
	CR_CONNECTION_ERROR: 'connection_failure',
	CR_CONN_HOST_ERROR: 'connection_failure',
	CR_SERVER_GONE_ERROR: 'connection_failure',
	CR_SERVER_LOST: 'connection_failure',
}

const SQLITE_ERRNO_CODES: Readonly<Record<string, SQLErrorCode>> = {
	'2067': 'unique_violation',
	'1555': 'unique_violation',
	'2579': 'unique_violation',
	'787': 'foreign_key_violation',
	'1299': 'not_null_violation',
	'275': 'check_violation',
	'517': 'serialization_failure',
}

const SQLITE_NATIVE_CODES: Readonly<Record<string, SQLErrorCode>> = {
	SQLITE_CONSTRAINT_UNIQUE: 'unique_violation',
	SQLITE_CONSTRAINT_PRIMARYKEY: 'unique_violation',
	SQLITE_CONSTRAINT_ROWID: 'unique_violation',
	SQLITE_CONSTRAINT_FOREIGNKEY: 'foreign_key_violation',
	SQLITE_CONSTRAINT_NOTNULL: 'not_null_violation',
	SQLITE_CONSTRAINT_CHECK: 'check_violation',
	SQLITE_BUSY_SNAPSHOT: 'serialization_failure',
}

const POSTGRES_CONNECTION_CODES = new Set([
	'ERR_POSTGRES_CONNECTION_CLOSED',
	'ERR_POSTGRES_CONNECTION_FAILED',
	'ERR_POSTGRES_CONNECTION_REFUSED',
	'ERR_POSTGRES_CONNECTION_TIMEOUT',
	'ERR_POSTGRES_IDLE_TIMEOUT',
	'ERR_POSTGRES_LIFETIME_TIMEOUT',
	'ERR_POSTGRES_TLS_NOT_AVAILABLE',
	'ERR_POSTGRES_TLS_UPGRADE_FAILED',
])

function nativeError(error: unknown): NativeSQLError | null {
	return error instanceof Error ? (error as NativeSQLError) : null
}

function nativeCode(error: NativeSQLError | null): string | number | undefined {
	return typeof error?.code === 'string' || typeof error?.code === 'number' ?
			error.code
		:	undefined
}

function nativeErrno(error: NativeSQLError | null): string | number | undefined {
	return typeof error?.errno === 'string' || typeof error?.errno === 'number' ?
			error.errno
		:	undefined
}

function sqlState(error: NativeSQLError | null, dialect: SQLDialect): string | undefined {
	if (typeof error?.sqlState === 'string') {
		return error.sqlState
	}

	const errno = nativeErrno(error)
	if (dialect === 'postgres' && typeof errno === 'string') {
		return errno
	}

	const code = nativeCode(error)
	if (
		(dialect === 'postgres' || dialect === 'mysql') &&
		typeof code === 'string' &&
		/^[0-9A-Z]{5}$/.test(code)
	) {
		return code
	}

	return undefined
}

function classifyPostgres(error: NativeSQLError | null): SQLErrorCode {
	const state = sqlState(error, 'postgres')
	if (state && POSTGRES_SQLSTATE_CODES[state]) {
		return POSTGRES_SQLSTATE_CODES[state]
	}
	if (state?.startsWith('08') || ['57P01', '57P02', '57P03'].includes(state ?? '')) {
		return 'connection_failure'
	}

	const code = nativeCode(error)
	if (typeof code === 'string' && POSTGRES_CONNECTION_CODES.has(code)) {
		return 'connection_failure'
	}

	return 'unknown'
}

function classifyMySQL(error: NativeSQLError | null): SQLErrorCode {
	const code = nativeCode(error)
	if (typeof code === 'string' && MYSQL_NATIVE_CODES[code]) {
		return MYSQL_NATIVE_CODES[code]
	}

	const errno = nativeErrno(error)
	if (errno !== undefined && MYSQL_ERRNO_CODES[String(errno)]) {
		return MYSQL_ERRNO_CODES[String(errno)]
	}

	const state = sqlState(error, 'mysql')
	if (state === '40001') {
		return 'serialization_failure'
	}
	if (state?.startsWith('08')) {
		return 'connection_failure'
	}

	return 'unknown'
}

function classifySQLite(error: NativeSQLError | null): SQLErrorCode {
	const code = nativeCode(error)
	if (typeof code === 'string' && SQLITE_NATIVE_CODES[code]) {
		return SQLITE_NATIVE_CODES[code]
	}
	if (
		typeof code === 'string' &&
		(code.startsWith('SQLITE_BUSY') || code.startsWith('SQLITE_LOCKED'))
	) {
		return 'database_busy'
	}
	if (typeof code === 'string' && code.startsWith('SQLITE_CANTOPEN')) {
		return 'connection_failure'
	}

	const errno = nativeErrno(error)
	if (errno !== undefined && SQLITE_ERRNO_CODES[String(errno)]) {
		return SQLITE_ERRNO_CODES[String(errno)]
	}
	if (typeof errno === 'number' && (errno & 0xff) === 5) {
		return 'database_busy'
	}
	if (typeof errno === 'number' && (errno & 0xff) === 6) {
		return 'database_busy'
	}
	if (typeof errno === 'number' && (errno & 0xff) === 14) {
		return 'connection_failure'
	}

	return 'unknown'
}

function classifySQLError(
	error: NativeSQLError | null,
	dialect: SQLDialect,
): SQLErrorCode {
	if (dialect === 'postgres') {
		return classifyPostgres(error)
	}
	if (dialect === 'mysql') {
		return classifyMySQL(error)
	}
	return classifySQLite(error)
}

function isDriverError(error: unknown, dialect: SQLDialect): boolean {
	if (error instanceof BunSQL.SQLError || error instanceof BunSQLiteError) {
		return true
	}

	const code = nativeCode(nativeError(error))
	return (
		typeof code === 'string' &&
		((dialect === 'postgres' && code.startsWith('ERR_POSTGRES_')) ||
			(dialect === 'mysql' && code.startsWith('ERR_MYSQL_')))
	)
}

/** A normalized SQL driver failure that retains its native cause and metadata. */
export class SQLError extends Error {
	readonly name = 'SQLError'
	/** Portable S42-Core category. */
	readonly code: SQLErrorCode
	/** Adapter that produced the failure. */
	readonly dialect: SQLDialect
	/** Original driver `code`, when available. */
	readonly nativeCode?: string | number
	/** Original Bun/database errno, when available. */
	readonly errno?: string | number
	/** PostgreSQL/MySQL SQLSTATE, when available. */
	readonly sqlstate?: string
	/** Constraint name reported structurally by the driver. */
	readonly constraint?: string
	/** Original driver error. */
	override readonly cause: unknown

	constructor(code: SQLErrorCode, dialect: SQLDialect, cause: unknown) {
		const original = nativeError(cause)
		super(original?.message ?? String(cause), { cause })

		this.code = code
		this.dialect = dialect
		this.nativeCode = nativeCode(original)
		this.errno = nativeErrno(original)
		this.sqlstate = sqlState(original, dialect)
		this.constraint =
			typeof original?.constraint === 'string' ? original.constraint : undefined
		this.cause = cause
	}
}

export function normalizeSQLError(
	error: unknown,
	dialect: SQLDialect,
	options: { assumeDriver?: boolean } = {},
): unknown {
	if (error instanceof SQLError) {
		return error
	}
	if (!options.assumeDriver && !isDriverError(error, dialect)) {
		return error
	}

	const original = nativeError(error)
	return new SQLError(classifySQLError(original, dialect), dialect, error)
}

/** Checks whether a value is an S42-Core SQL error, optionally by category. */
export function isSQLError<Code extends SQLErrorCode = SQLErrorCode>(
	error: unknown,
	code?: Code,
): error is SQLError & { readonly code: Code } {
	return error instanceof SQLError && (code === undefined || error.code === code)
}
