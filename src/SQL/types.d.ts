import { type TLSOptions } from 'bun'
import { type SQL } from './index'

export type tableRowSchema = {
	cid: number
	dflt_value: string | null
	name: string
	notnull: number
	pk: number
	type: string
}

export type tableInternalSchema = {
	name: string
	ncol: number
	schema: string
	strict: number
	type: string
	wr: number
}

export type ColumnDefinition = {
	[columnName: string]: string
}

export type SQLIndexColumn =
	| string
	| {
			name: string
			order?: 'ASC' | 'DESC' | 'asc' | 'desc'
	  }

export type CreateIndexOptions = {
	/** Explicit index name. Defaults to `idx_<table>_<columns>`. */
	name?: string
	/** Create a unique index. */
	unique?: boolean
	/**
	 * Add `IF NOT EXISTS`. Defaults to `true` for PostgreSQL/SQLite and
	 * `false` for MySQL, whose `CREATE INDEX` grammar does not support it.
	 */
	ifNotExists?: boolean
	/** PostgreSQL-only non-blocking index creation. */
	concurrently?: boolean
	/** PostgreSQL/MySQL index access method, for example `btree` or `hash`. */
	using?: string
	/** PostgreSQL-only non-key columns stored by the index. */
	include?: string[]
	/**
	 * PostgreSQL/SQLite partial-index predicate. This is a trusted raw SQL
	 * fragment and must never be built from request input.
	 */
	where?: string
}

export type SQLTransactionCallback<T> = (transaction: SQL) => T | PromiseLike<T>

export type SQLTransactionResult<T> =
	T extends PromiseLike<unknown>[] ? { [Key in keyof T]: Awaited<T[Key]> } : Awaited<T>

export type KeyValueData = { [key: string]: any }

export type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
	affectedRows?: number
}

export type TypeSQLConnection = {
	type: 'mysql' | 'postgres' | 'sqlite'
	url?: string
	tls?: TLSOptions
}
