import { Database } from 'bun:sqlite'
import { SQL as BunSQL } from 'bun'
import type {
	ColumnDefinition,
	KeyValueData,
	TypeReturnQuery,
	TypeSQLConnection,
	tableInternalSchema,
	tableRowSchema,
} from './types'
import {
	assertValidColumns,
	assertValidIdentifier,
	assertValidSortKeys,
	translateMongoJsonToSql,
} from './identifiers'
import { extractAffectedRows, extractLastInsertId } from './results'

export { translateMongoJsonToSql }

export class SQL {
	private dbInstance: any
	private dbType: 'mysql' | 'postgres' | 'sqlite'

	constructor(config: TypeSQLConnection) {
		this.dbType = config.type
		if (this.dbType === 'sqlite') {
			this.dbInstance = new Database(config.url || 'db.sqlite')
			this.dbInstance.exec('PRAGMA journal_mode = WAL;')
		} else {
			// For Postgres and MySQL, we use Bun's native SQL client
			if (config.url) {
				this.dbInstance = new BunSQL(config.url, {
					...(config.tls ? { tls: config.tls } : {}),
				})
			} else {
				// Fallback to default env vars if no URL provided, or empty constructor
				this.dbInstance = new BunSQL()
			}
		}
	}

	private async executeQuery(query: string, params: any[] = []): Promise<any> {
		if (this.dbType === 'sqlite') {
			const statement = this.dbInstance.prepare(query)
			if (
				query.trim().toUpperCase().startsWith('SELECT') ||
				query.trim().toUpperCase().startsWith('PRAGMA')
			) {
				return statement.all(...params)
			} else {
				return statement.run(...params)
			}
		} else {
			// Bun SQL (Postgres/MySQL)
			// We use the template tag function simulation by splitting the query by '?'
			// This allows us to pass parameters safely to Bun's SQL template tag.

			if (this.dbType === 'postgres' || this.dbType === 'mysql') {
				const parts = query.split('?')

				// Safety check: ensure parts match params
				// Note: This simple split might fail if '?' is inside a string literal in the query.
				// For a robust implementation, a proper SQL parser/tokenizer is needed,
				// but for this abstraction level we assume standard usage.

				const strings: any = parts
				strings.raw = parts

				return this.dbInstance(strings, ...params)
			}
		}
	}

	public async createTable(tableName: string, data: ColumnDefinition): Promise<boolean> {
		assertValidIdentifier(tableName, 'table name')
		Object.keys(data).forEach(column => assertValidIdentifier(column, 'column'))
		const columns = Object.entries(data)
			.map(([columnName, type]) => `${columnName} ${type.toUpperCase()}`)
			.join(', ')

		const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`
		try {
			await this.executeQuery(query)
			return true
		} catch (err) {
			console.error(err)
			throw err
		}
	}

	public async insert(
		tableName: string,
		data: KeyValueData,
	): Promise<TypeReturnQuery | null> {
		assertValidIdentifier(tableName, 'table name')
		const keys = Object.keys(data)
		keys.forEach(column => assertValidIdentifier(column, 'column'))
		const values = Object.values(data)

		const placeholders = keys.map(() => '?').join(', ')
		const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`

		// For Postgres, we might want RETURNING id to get the last insert id.
		// For MySQL/SQLite, it is usually returned in the result.
		let finalQuery = query
		if (this.dbType === 'postgres') {
			finalQuery += ' RETURNING *' // Or specific ID column if known, but * is safer for generic return
		}

		const result = await this.executeQuery(finalQuery, values)
		const affectedRows = extractAffectedRows(result)
		return {
			lastInsertRowId: extractLastInsertId(result),
			changes: affectedRows,
			affectedRows,
		}
	}

	public async createIndex(tableName: string, columnName: string): Promise<void> {
		assertValidIdentifier(tableName, 'table name')
		assertValidIdentifier(columnName, 'column')
		try {
			const query = `CREATE INDEX IF NOT EXISTS idx_${tableName}_${columnName} ON ${tableName} (${columnName})`
			await this.executeQuery(query)
		} catch (err) {
			console.info('Error creating index: ', err)
			throw err
		}
	}

	public async addTableColumns(
		tableName: string,
		changes: ColumnDefinition,
	): Promise<boolean> {
		assertValidIdentifier(tableName, 'table name')
		Object.keys(changes).forEach(column => assertValidIdentifier(column, 'column'))
		try {
			const alterClauses = Object.entries(changes).map(
				([column, type]) => `ADD COLUMN ${column} ${type.toUpperCase()}`,
			)
			for (const clause of alterClauses) {
				const query = `ALTER TABLE ${tableName} ${clause}`
				await this.executeQuery(query)
			}
			return true
		} catch (err) {
			console.info('Error addTableColums: ', err)
			throw err
		}
	}

	public async getAllTables(): Promise<tableInternalSchema[]> {
		let query = ''
		if (this.dbType === 'sqlite') {
			query = 'PRAGMA table_list'
		} else if (this.dbType === 'postgres') {
			query = `SELECT tablename as name FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'`
		} else {
			// MySQL
			query = 'SHOW TABLES'
		}

		const result = await this.executeQuery(query)

		if (this.dbType === 'sqlite') {
			return result as tableInternalSchema[]
		} else if (this.dbType === 'postgres') {
			// Map to tableInternalSchema
			return result.map((row: any) => ({ name: row.name, type: 'table' }) as any)
		} else {
			// MySQL returns { Tables_in_dbname: 'tablename' }
			return result.map(
				(row: any) => ({ name: Object.values(row)[0], type: 'table' }) as any,
			)
		}
	}

	public async getTableSchema(tableName: string): Promise<tableRowSchema[]> {
		assertValidIdentifier(tableName, 'table name')
		if (this.dbType === 'sqlite') {
			const query = `PRAGMA table_info(${tableName})`
			return await this.executeQuery(query)
		} else if (this.dbType === 'postgres') {
			const query = `SELECT column_name as name, data_type as type, is_nullable as notnull, column_default as dflt_value FROM information_schema.columns WHERE table_name = ?`
			const result = await this.executeQuery(query, [tableName])
			// Map to tableRowSchema
			return result.map((row: any) => ({
				name: row.name,
				type: row.type,
				notnull: row.notnull === 'NO' ? 1 : 0,
				dflt_value: row.dflt_value,
				pk: 0, // Hard to get PK simply in one query without joins
				cid: 0,
			}))
		} else {
			// MySQL
			const query = `DESCRIBE ${tableName}`
			const result = await this.executeQuery(query)
			return result.map((row: any) => ({
				name: row.Field,
				type: row.Type,
				notnull: row.Null === 'NO' ? 1 : 0,
				dflt_value: row.Default,
				pk: row.Key === 'PRI' ? 1 : 0,
				cid: 0,
			}))
		}
	}

	public async validateTableSchema(
		tableName: string,
		expectedSchema: ColumnDefinition,
	): Promise<boolean> {
		const result = await this.getTableSchema(tableName)
		const existingColumns: string[] = result.map(row => row.name)
		if (Object.keys(expectedSchema).length === 0) {
			throw new Error('Table schema not defined')
		}
		return Object.keys(expectedSchema).every(column => existingColumns.includes(column))
	}

	public async dropTable(tableName: string): Promise<boolean | null> {
		assertValidIdentifier(tableName, 'table name')
		const query = `DROP TABLE IF EXISTS ${tableName}`
		await this.executeQuery(query)
		return true
	}

	public async delete(tableName: string, whereClause?: object): Promise<number | null> {
		assertValidIdentifier(tableName, 'table name')
		let whereSentence = ''
		let whereArgs: any[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
		}
		const query = `DELETE FROM ${tableName} ${whereSentence}`
		const result = await this.executeQuery(query, whereArgs)
		return extractAffectedRows(result)
	}

	public async deleteById(
		tableName: string,
		id: string | number,
	): Promise<number | null> {
		return this.delete(tableName, { id })
	}

	public async update({
		tableName,
		whereClause,
		data,
	}: {
		tableName: string
		whereClause: object
		data: KeyValueData
	}): Promise<number | null> {
		assertValidIdentifier(tableName, 'table name')
		Object.keys(data).forEach(column => assertValidIdentifier(column, 'column'))
		const setClause = Object.keys(data)
			.map(key => `${key} = ?`)
			.join(', ')
		const values = Object.values(data)

		let whereSentence = ''
		let whereArgs: any[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
		}

		const query = `UPDATE ${tableName} SET ${setClause} ${whereSentence}`
		const result = await this.executeQuery(query, [...values, ...whereArgs])
		return extractAffectedRows(result)
	}

	public async updateById(
		tableName: string,
		id: string | number,
		data: KeyValueData,
	): Promise<number | null> {
		return this.update({ tableName, whereClause: { id }, data })
	}

	public async count({
		tableName,
		whereClause,
	}: {
		tableName: string
		whereClause?: object
	}): Promise<number> {
		assertValidIdentifier(tableName, 'table name')
		let whereSentence = ''
		let whereArgs: any[] = []
		if (whereClause) {
			const splited = translateMongoJsonToSql(whereClause)
			whereSentence = splited.whereStatement
			whereArgs = splited.values
		}

		const query = `SELECT COUNT(*) as total FROM ${tableName} ${whereSentence}`
		const result = await this.executeQuery(query, whereArgs)
		const total = result[0].total || result[0]['COUNT(*)'] || 0
		return Number(total)
	}

	public async select<T>({
		tableName,
		columns = ['*'],
		whereClause,
		sort,
		limit = 100,
		page = 1,
	}: {
		tableName: string
		columns?: string[]
		whereClause?: object
		sort?: { [key: string]: number }
		limit?: number
		page?: number
	}): Promise<T[] | null> {
		assertValidIdentifier(tableName, 'table name')
		assertValidColumns(columns)
		if (sort) {
			assertValidSortKeys(sort)
		}
		let whereSentence = ''
		let whereArgs: any[] = []
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
		if (limit) {
			query += ` LIMIT ${limit}`
		}
		if (page) {
			query += ` OFFSET ${(page - 1) * limit}`
		}

		try {
			const result = await this.executeQuery(query, whereArgs)
			return result as T[]
		} catch (err: any) {
			throw new Error(`Failed to execute SELECT query: ${err.message}`)
		}
	}

	public async selectPaginate<T>({
		tableName,
		page = 1,
		limit = 10,
		columns = ['*'],
		whereClause,
		sort,
	}: {
		tableName: string
		page?: number
		limit?: number
		columns?: string[]
		whereClause?: object
		sort?: { [key: string]: number }
	}): Promise<{ data: T[]; total: number; page: number; limit: number }> {
		const data = await this.select<T>({
			tableName,
			columns,
			whereClause,
			sort,
			limit,
			page,
		})

		// Count total
		const total = await this.count({ tableName, whereClause })

		return {
			data: data || [],
			total: Number(total),
			page,
			limit,
		}
	}
}
