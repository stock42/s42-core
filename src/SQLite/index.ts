import { Database, type SQLQueryBindings } from 'bun:sqlite'
import {
	assertValidColumns,
	assertValidIdentifier,
	assertValidSortKeys,
	translateMongoJsonToSql,
} from '../SQL/identifiers'
import { normalizeSQLError } from '../SQL/errors'
import { logger } from '../Logger'

export { translateMongoJsonToSql }

export type TypeTableSchema = { [key: string]: string }

export type TypeSQLiteConnection = {
	type: 'file' | 'memory'
	filename?: string
}

export type tableInternalSchema = {
	name: string
	ncol: number
	schema: string
	strict: number
	type: string
	wr: number
}

export type tableRowSchema = {
	cid: number
	dflt_value: string | null
	name: string
	notnull: number
	pk: number
	type: string
}

export type KeyValueData = { [key: string]: any }
export type ColumnDefinition = {
	[columnName: string]: string
}

export type Changes = {
	lastInsertRowid: number | bigint
	changes: number | bigint
}

export class SQLite {
	private type: string
	private database: Database

	constructor(props: TypeSQLiteConnection) {
		this.type = props.type

		if (props.type === 'file' && !props.filename) {
			throw new Error('Require "file" prop')
		}

		try {
			if (this.type === 'memory') {
				this.database = new Database(':memory:')
			} else {
				this.database = new Database(props.filename!)
			}
		} catch (error) {
			throw normalizeSQLError(error, 'sqlite', { assumeDriver: true })
		}
	}

	private runDriverOperation<T>(operation: () => T): T {
		try {
			return operation()
		} catch (error) {
			throw normalizeSQLError(error, 'sqlite', { assumeDriver: true })
		}
	}

	public close() {
		try {
			this.database.close()
		} catch (err) {
			logger.error('Error closing database:', err)
		}
	}

	private tableMatch(tableName: string) {
		assertValidIdentifier(tableName, 'table name')
		return true
	}

	public createTable(tableName: string, schema: TypeTableSchema): Changes {
		if (!tableName || typeof tableName !== 'string') {
			throw new Error('Invalid table name')
		}
		this.tableMatch(tableName)
		Object.keys(schema).forEach(column => assertValidIdentifier(column, 'column'))

		schema['added'] = 'integer'
		const columns = Object.entries(schema)
			.map(([columnName, type]) => `${columnName} ${type.toUpperCase()}`)
			.join(', ')

		return this.runDriverOperation(() => {
			const query = this.database.query(
				`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`,
			)
			return query.run()
		})
	}

	public async addTableColumns(
		tableName: string,
		changes: ColumnDefinition,
	): Promise<Changes[]> {
		this.tableMatch(tableName)
		Object.keys(changes).forEach(column => assertValidIdentifier(column, 'column'))
		try {
			const alterClauses = Object.entries(changes).map(
				([column, type]) => `ADD COLUMN ${column} ${type.toUpperCase()}`,
			)

			let results: Changes[] = []
			for (const clause of alterClauses) {
				const query = `ALTER TABLE ${tableName} ${clause}`
				const result = this.runDriverOperation(() => this.database.run(query))
				results.push(result)
			}
			return results
		} catch (err) {
			logger.info('Error addTableColums: ', err)
			throw err
		}
	}

	public dropTable(tableName: string): Changes {
		this.tableMatch(tableName)
		return this.runDriverOperation(() => {
			const query = this.database.query(`DROP TABLE IF EXISTS ${tableName}`)
			return query.run()
		})
	}

	public async delete(tableName: string, whereClause?: object): Promise<Changes> {
		this.tableMatch(tableName)
		let whereSentence = ''
		let whereArgs: SQLQueryBindings[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values as SQLQueryBindings[]
		}
		return this.runDriverOperation(() => {
			const query = this.database.prepare(`DELETE FROM ${tableName} ${whereSentence}`)
			return query.run(...whereArgs)
		})
	}

	public insert(tableName: string, data: { [key: string]: SQLQueryBindings }) {
		this.tableMatch(tableName)
		Object.keys(data).forEach(column => assertValidIdentifier(column, 'column'))
		data['added'] = new Date().getTime()
		const values = Object.values(data)

		const columns = Object.keys(data).join(', ')
		const placeholders = Object.keys(data)
			.map(() => '?')
			.join(', ')

		const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`
		this.runDriverOperation(() => {
			this.database.run(query, values)
		})
	}

	public async createIndex(tableName: string, columnName: string): Promise<Changes> {
		try {
			this.tableMatch(tableName)
			assertValidIdentifier(columnName, 'column')
			return this.runDriverOperation(() => {
				const query = this.database.query(
					`CREATE INDEX IF NOT EXISTS idx_${tableName}_${columnName} ON ${tableName} (${columnName})`,
				)
				return query.run()
			})
		} catch (err) {
			logger.info('Error creating index: ', err)
			throw err
		}
	}

	public async getAllTables(): Promise<tableInternalSchema[]> {
		return this.runDriverOperation(() => {
			const query = this.database.query('PRAGMA table_list')
			return query.all() as tableInternalSchema[]
		})
	}

	public async getTableSchema(tableName: string): Promise<tableRowSchema[]> {
		this.tableMatch(tableName)
		return this.runDriverOperation(() => {
			const query = this.database.query(`PRAGMA table_info(${tableName})`)
			return query.all() as tableRowSchema[]
		})
	}

	public async update(
		tableName: string,
		whereClause: object,
		data: KeyValueData,
	): Promise<Changes> {
		this.tableMatch(tableName)
		Object.keys(data).forEach(column => assertValidIdentifier(column, 'column'))
		const setClause = Object.keys(data)
			.map(key => `${key} = ?`)
			.join(', ')
		const values = Object.values(data) as SQLQueryBindings[]

		let whereSentence = ''
		let whereArgs: SQLQueryBindings[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values as SQLQueryBindings[]
		}

		const query = `UPDATE ${tableName} SET ${setClause} ${whereSentence}`
		return this.runDriverOperation(() =>
			this.database.prepare(query).run(...values, ...whereArgs),
		)
	}

	public async select<T>(
		tableName: string,
		columns: string[] = ['*'],
		whereClause?: object,
		sort?: { [key: string]: number },
		limit?: number,
		offset?: number,
	): Promise<T[] | null> {
		this.tableMatch(tableName)
		assertValidColumns(columns)
		if (sort) {
			assertValidSortKeys(sort)
		}
		let whereSentence = ''
		let whereArgs: SQLQueryBindings[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values as SQLQueryBindings[]
		}

		let orderByClause = ''
		if (sort) {
			const sortClauses = Object.entries(sort).map(([key, value]) => {
				const direction = value === 1 ? 'ASC' : 'DESC'
				return `${key} ${direction}`
			})
			orderByClause = `ORDER BY ${sortClauses.join(', ')}`
		}

		let query = `SELECT ${columns.join(', ')} FROM ${tableName} ${whereSentence} ${orderByClause}`
		if (limit) {
			query += ` LIMIT ${limit}`
		}
		if (offset) {
			query += ` OFFSET ${offset}`
		}
		return this.runDriverOperation(
			() => this.database.prepare(query).all(...whereArgs) as T[],
		)
	}
}
