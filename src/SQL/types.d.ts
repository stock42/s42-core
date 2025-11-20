
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

export type KeyValueData = { [key: string]: any }

export type TypeReturnQuery = {
	lastInsertRowId?: number | string
	changes?: number
    affectedRows?: number
}

export type TypeSQLConnection = {
    type: 'mysql' | 'postgres' | 'sqlite'
    url?: string
    config?: any
}
