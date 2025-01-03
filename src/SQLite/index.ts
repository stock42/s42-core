import { Database, type SQLQueryBindings } from 'bun:sqlite'

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

export function translateMongoJsonToSql(query: object) {
	const operatorsMap: { [key: string]: string } = {
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

	const whereClauses = []
	const values = []

	for (const [field, condition] of Object.entries(query)) {
		if (typeof condition === 'object' && condition !== null) {
			for (const [operator, value] of Object.entries(condition)) {
				const sqlOperator = operatorsMap[operator]
				if (sqlOperator) {
					if (operator === '$in' || operator === '$nin') {
						if (Array.isArray(value)) {
							const placeholders = value.map(() => '?').join(', ')
							whereClauses.push(`${field} ${sqlOperator} (${placeholders})`)
							values.push(...value)
						} else {
							throw new Error(`Value for ${operator} must be an array`)
						}
					} else {
						whereClauses.push(`${field} ${sqlOperator} ?`)
						values.push(value)
					}
				} else {
					throw new Error(`Unsupported operator: ${operator}`)
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

export class SQLite {
	private type: string
	private database: Database

	constructor(props: TypeSQLiteConnection) {
		this.type = props.type

		if (props.type === 'file' && !props.filename) {
			throw new Error('Require "file" prop')
		}

		if (this.type === 'memory') {
			this.database = new Database(':memory:')
		} else {
			this.database = new Database(props.filename!)
		}
	}

	public close() {
		try {
			this.database.close()
		} catch (err) {
			console.error('Error closing database:', err)
		}
	}

	private tableMatch(tableName: string) {
		if (!tableName.match(/^[a-zA-Z0-9_]+$/)) {
			throw new Error(`Invalid table name: ${tableName}`);
		}
		return true
	}

	public createTable(tableName: string, schema: TypeTableSchema): Changes {
		try {
			if (!tableName || typeof tableName !== 'string' || this.tableMatch(tableName)) {
				throw new Error('Invalid table name');
			}

			schema['added'] = 'integer'
			const columns = Object.entries(schema)
					.map(([columnName, type]) => `${columnName} ${type.toUpperCase()}`)
					.join(', ');

			const query = this.database.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`)
			return query.run()
		} catch (err) {
			throw new Error(`Error creating table: ${String(err)}`)
		}
	}

	public async addTableColumns(
		tableName: string,
		changes: ColumnDefinition,
	): Promise<Changes[]> {
		try {
			const alterClauses = Object.entries(changes).map(
				([column, type]) => `ADD COLUMN ${column} ${type.toUpperCase()}`,
			)

			let results: Changes[] = []
			for (const clause of alterClauses) {
				const query = `ALTER TABLE ${tableName} ${clause}`
				const result = this.database.run(query)
				results.push(result)
			}
			return results
		} catch (err) {
			console.info('Error addTableColums: ', err)
			throw err
		}
	}

	public dropTable(tableName: string): Changes {
		try {
			this.tableMatch(tableName)
			const query = this.database.query(`DROP TABLE IF EXISTS ${tableName}`)
			return query.run()
		} catch (err) {
			throw new Error(`Error dropping table: ${String(err)}`)
		}
	}

	public async delete(tableName: string, whereClause?: object): Promise<Changes> {
		let whereSentence = ''
		let whereArgs = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
		}
		const query = this.database.prepare(`DELETE FROM ${tableName} ${whereSentence}`, whereArgs)
		try {
			const result = query.run()
			return result
		} catch (err) {
			throw err
		}
	}


	public insert(tableName: string, data: { [key: string]: SQLQueryBindings }) {
		try {
			data['added'] = new Date().getTime()
			const keys = Object.keys(data)
			const values = Object.values(data)

			const columns = Object.keys(data).join(', ')
			const placeholders = Object.keys(data)
				.map(() => '?')
				.join(', ')

			const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`
			this.database.run(query, ...Object.values(data))
		} catch (err) {
			throw new Error(`Error inserting data: ${String(err)}`)
		}
	}

	public async createIndex(tableName: string, columnName: string): Promise<Changes> {
		try {
			this.tableMatch(tableName)
			const query = this.database.query(`CREATE INDEX IF NOT EXISTS idx_${tableName}_${columnName} ON ${tableName} (${columnName})`)
			return query.run()
		} catch (err) {
			console.info('Error creating index: ', err)
			throw err
		}
	}

	public async getAllTables(): Promise<tableInternalSchema[]> {
		const query = this.database.query('PRAGMA table_list')
		const result: tableInternalSchema[] = query.all() as tableInternalSchema[]
		return result
	}

	public async getTableSchema(tableName: string): Promise<tableRowSchema[]> {
		const query = this.database.query(`PRAGMA table_info(${tableName})`)
		const result: tableRowSchema[] = query.all() as tableRowSchema[]
		return result
	}

	public async update(
		tableName: string,
		whereClause: object,
		data: KeyValueData,
	): Promise<Changes> {
		this.tableMatch(tableName)
		const setClause = Object.keys(data)
			.map(key => `${key} = ?`)
			.join(', ')
		const values = Object.values(data)

		let whereSentence = ''
		let whereArgs = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
		}

		const query = `UPDATE ${tableName} SET ${setClause} ${whereSentence}`
		try {
			const result =  this.database.prepare(query, [...values, ...whereArgs]).run()
			return result
		} catch (err) {
			throw err
		}
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
		let whereSentence = ''
		let whereArgs = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
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
		try {
			if (limit) {
				query += ` LIMIT ${limit}`
			}
			if (offset) {
				query += ` OFFSET ${offset}`
			}
			const result = this.database.query(query).all() as T[]
			return result
		} catch (err: any) {
			throw new Error(`Failed to execute SELECT query: ${err.message}`);
		}
	}
}
