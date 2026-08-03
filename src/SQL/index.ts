import { SQL as BunSQL, type TransactionSQL as BunTransactionSQL } from 'bun'
import { logger } from '../Logger'
import type {
	ColumnDefinition,
	CreateIndexOptions,
	DropIndexOptions,
	KeyValueData,
	SQLCloseOptions,
	SQLIndexColumn,
	SQLTransactionCallback,
	SQLTransactionResult,
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
import { normalizeSQLError } from './errors'
import { extractAffectedRows, extractLastInsertId } from './results'

export { translateMongoJsonToSql }
export { SQLError, isSQLError } from './errors'
export type { SQLErrorCode, SQLDialect } from './errors'

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
	return (
		value !== null &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (value as { then?: unknown }).then === 'function'
	)
}

export class SQL {
	private dbInstance: BunSQL
	private dbType: 'mysql' | 'postgres' | 'sqlite'
	private ready: Promise<void> | null = null
	private transactionContext = false

	constructor(config: TypeSQLConnection) {
		this.dbType = config.type
		if (this.dbType === 'sqlite') {
			this.dbInstance = new BunSQL({
				adapter: 'sqlite',
				filename: config.url || 'db.sqlite',
			})
		} else {
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

	private assertRootLifecycle(method: 'connect' | 'ping' | 'close' | 'end'): void {
		if (this.transactionContext) {
			throw new Error(`${method} cannot be used from a transaction-scoped SQL client`)
		}
	}

	private createScopedClient(dbInstance: BunSQL): SQL {
		const scoped = Object.create(SQL.prototype) as SQL

		scoped.dbInstance = dbInstance
		scoped.dbType = this.dbType
		scoped.ready = this.ready ?? Promise.resolve()
		scoped.transactionContext = true
		return scoped
	}

	private async runDriverOperation<T>(
		operation: () => PromiseLike<T>,
		assumeDriver = true,
	): Promise<T> {
		try {
			return await operation()
		} catch (error) {
			throw normalizeSQLError(error, this.dbType, { assumeDriver })
		}
	}

	private runTransactionCallback<T>(
		callback: SQLTransactionCallback<T>,
		dbInstance: BunSQL,
		callbackErrors: Set<unknown>,
	): T | Promise<T> {
		try {
			const result = callback(this.createScopedClient(dbInstance))
			if (!isPromiseLike(result)) {
				return result
			}

			return Promise.resolve(result).catch(error => {
				callbackErrors.add(error)
				throw error
			}) as Promise<T>
		} catch (error) {
			callbackErrors.add(error)
			throw error
		}
	}

	private async runTransactionOperation<T>(
		operation: () => PromiseLike<T>,
		callbackErrors: Set<unknown>,
	): Promise<T> {
		try {
			return await operation()
		} catch (error) {
			if (callbackErrors.has(error)) {
				throw error
			}
			throw normalizeSQLError(error, this.dbType, { assumeDriver: true })
		}
	}

	private async ensureReady(): Promise<void> {
		if (this.dbType !== 'sqlite') {
			return
		}

		this.ready ??= this.runDriverOperation(async () => {
			await this.dbInstance.unsafe('PRAGMA journal_mode = WAL;')
		})
		await this.ready
	}

	private async executeQuery(query: string, params: any[] = []): Promise<any> {
		await this.ensureReady()
		return this.runDriverOperation(async () => {
			if (params.length === 0) {
				return await this.dbInstance.unsafe(query)
			}

			// We use tagged-template simulation so Bun binds the generated `?`
			// placeholders for every supported adapter.
			const parts = query.split('?')
			const strings: any = parts

			strings.raw = parts
			return await this.dbInstance(strings, ...params)
		})
	}

	/** Establishes one native Bun.SQL connection and initializes wrapper state. */
	public async connect(): Promise<this> {
		this.assertRootLifecycle('connect')
		await this.runDriverOperation(() => this.dbInstance.connect())
		await this.ensureReady()
		return this
	}

	/** Executes a portable query round trip against the database. */
	public async ping(): Promise<void> {
		this.assertRootLifecycle('ping')
		await this.executeRaw('SELECT 1')
	}

	/** Waits for pending queries and closes the native connection or pool. */
	public async close(options?: SQLCloseOptions): Promise<void> {
		this.assertRootLifecycle('close')
		await this.runDriverOperation(() => this.dbInstance.close(options))
	}

	/** Alias of close(), matching Bun.SQL.end(). */
	public async end(options?: SQLCloseOptions): Promise<void> {
		this.assertRootLifecycle('end')
		await this.close(options)
	}

	/**
	 * Executes a trusted SQL string through Bun.SQL's `unsafe` escape hatch.
	 * Values remain bound when `params` is provided, but the query text is not
	 * parsed or escaped by S42-Core.
	 */
	public async executeRaw<T = unknown>(query: string, params: any[] = []): Promise<T> {
		if (typeof query !== 'string' || query.trim().length === 0) {
			throw new Error('Raw SQL query must be a non-empty string')
		}

		await this.ensureReady()
		return this.runDriverOperation(async () => {
			return (await this.dbInstance.unsafe<T>(query, params)) as T
		})
	}

	public begin<T>(callback: SQLTransactionCallback<T>): Promise<SQLTransactionResult<T>>
	public begin<T>(
		options: string,
		callback: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>>
	public async begin<T>(
		optionsOrCallback: string | SQLTransactionCallback<T>,
		callback?: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>> {
		await this.ensureReady()
		if (typeof optionsOrCallback === 'function') {
			const callbackErrors = new Set<unknown>()
			return this.runTransactionOperation(
				() =>
					this.dbInstance.begin(transaction =>
						this.runTransactionCallback(optionsOrCallback, transaction, callbackErrors),
					),
				callbackErrors,
			) as Promise<SQLTransactionResult<T>>
		}
		if (!callback) {
			throw new Error('begin requires a transaction callback')
		}

		const callbackErrors = new Set<unknown>()
		return this.runTransactionOperation(
			() =>
				this.dbInstance.begin(optionsOrCallback, transaction =>
					this.runTransactionCallback(callback, transaction, callbackErrors),
				),
			callbackErrors,
		) as Promise<SQLTransactionResult<T>>
	}

	public transaction<T>(
		callback: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>>
	public transaction<T>(
		options: string,
		callback: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>>
	public async transaction<T>(
		optionsOrCallback: string | SQLTransactionCallback<T>,
		callback?: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>> {
		await this.ensureReady()
		if (typeof optionsOrCallback === 'function') {
			const callbackErrors = new Set<unknown>()
			return this.runTransactionOperation(
				() =>
					this.dbInstance.transaction(transaction =>
						this.runTransactionCallback(optionsOrCallback, transaction, callbackErrors),
					),
				callbackErrors,
			) as Promise<SQLTransactionResult<T>>
		}
		if (!callback) {
			throw new Error('transaction requires a transaction callback')
		}

		const callbackErrors = new Set<unknown>()
		return this.runTransactionOperation(
			() =>
				this.dbInstance.transaction(optionsOrCallback, transaction =>
					this.runTransactionCallback(callback, transaction, callbackErrors),
				),
			callbackErrors,
		) as Promise<SQLTransactionResult<T>>
	}

	public async beginDistributed<T>(
		name: string,
		callback: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>> {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error('Distributed transaction name must be a non-empty string')
		}

		await this.ensureReady()
		const callbackErrors = new Set<unknown>()
		return this.runTransactionOperation(
			() =>
				this.dbInstance.beginDistributed(name, transaction =>
					this.runTransactionCallback(callback, transaction, callbackErrors),
				),
			callbackErrors,
		) as Promise<SQLTransactionResult<T>>
	}

	public async distributed<T>(
		name: string,
		callback: SQLTransactionCallback<T>,
	): Promise<SQLTransactionResult<T>> {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error('Distributed transaction name must be a non-empty string')
		}

		await this.ensureReady()
		const callbackErrors = new Set<unknown>()
		return this.runTransactionOperation(
			() =>
				this.dbInstance.distributed(name, transaction =>
					this.runTransactionCallback(callback, transaction, callbackErrors),
				),
			callbackErrors,
		) as Promise<SQLTransactionResult<T>>
	}

	public async commitDistributed(name: string): Promise<void> {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error('Distributed transaction name must be a non-empty string')
		}

		await this.ensureReady()
		await this.runDriverOperation(() => this.dbInstance.commitDistributed(name))
	}

	public async rollbackDistributed(name: string): Promise<void> {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error('Distributed transaction name must be a non-empty string')
		}

		await this.ensureReady()
		await this.runDriverOperation(() => this.dbInstance.rollbackDistributed(name))
	}

	public savepoint<T>(callback: SQLTransactionCallback<T>): Promise<T>
	public savepoint<T>(name: string, callback: SQLTransactionCallback<T>): Promise<T>
	public async savepoint<T>(
		nameOrCallback: string | SQLTransactionCallback<T>,
		callback?: SQLTransactionCallback<T>,
	): Promise<T> {
		if (!this.transactionContext) {
			throw new Error('savepoint can only be used inside a transaction callback')
		}

		const transaction = this.dbInstance as BunTransactionSQL
		if (typeof nameOrCallback === 'function') {
			const callbackErrors = new Set<unknown>()
			return this.runTransactionOperation(
				() =>
					transaction.savepoint(savepoint =>
						this.runTransactionCallback(nameOrCallback, savepoint, callbackErrors),
					),
				callbackErrors,
			)
		}
		if (nameOrCallback.length === 0) {
			throw new Error('Savepoint name must be a non-empty string')
		}
		if (!callback) {
			throw new Error('savepoint requires a callback')
		}

		const callbackErrors = new Set<unknown>()
		return this.runTransactionOperation(
			() =>
				transaction.savepoint(nameOrCallback, savepoint =>
					this.runTransactionCallback(callback, savepoint, callbackErrors),
				),
			callbackErrors,
		)
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
			logger.error(err)
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

	public async createIndex(
		tableName: string,
		columns: string | SQLIndexColumn[],
		options: CreateIndexOptions = {},
	): Promise<void> {
		assertValidIdentifier(tableName, 'table name')
		const indexColumns =
			typeof columns === 'string' ? [columns]
			: Array.isArray(columns) ? columns
			: []
		if (indexColumns.length === 0) {
			throw new Error('createIndex requires at least one column')
		}

		const normalizedColumns = indexColumns.map(column => {
			const definition = typeof column === 'string' ? { name: column } : column

			assertValidIdentifier(definition.name, 'index column')
			const order = definition.order?.toUpperCase()
			if (order !== undefined && order !== 'ASC' && order !== 'DESC') {
				throw new Error(`Invalid index order for column "${definition.name}"`)
			}

			return { name: definition.name, order }
		})
		const defaultIndexName = `idx_${tableName.replaceAll('.', '_')}_${normalizedColumns
			.map(column => column.name.replaceAll('.', '_'))
			.join('_')}`
		const indexName = options.name ?? defaultIndexName

		assertValidIdentifier(indexName, 'index name')
		if (options.using) {
			assertValidIdentifier(options.using, 'index method')
		}
		options.include?.forEach(column => assertValidIdentifier(column, 'included column'))
		if (options.where !== undefined && options.where.trim().length === 0) {
			throw new Error('Index WHERE predicate must be a non-empty string')
		}

		const ifNotExists = options.ifNotExists ?? this.dbType !== 'mysql'
		if (this.dbType === 'mysql') {
			if (ifNotExists) {
				throw new Error('MySQL CREATE INDEX does not support IF NOT EXISTS')
			}
			if (options.concurrently) {
				throw new Error('MySQL CREATE INDEX does not support CONCURRENTLY')
			}
			if (options.include?.length) {
				throw new Error('MySQL CREATE INDEX does not support INCLUDE')
			}
			if (options.where) {
				throw new Error('MySQL does not support partial indexes with WHERE')
			}
		}
		if (this.dbType === 'sqlite' && options.using) {
			throw new Error('SQLite CREATE INDEX does not support USING')
		}
		if (this.dbType !== 'postgres' && options.include?.length) {
			throw new Error('INCLUDE is only supported for PostgreSQL indexes')
		}
		if (this.dbType !== 'postgres' && options.concurrently) {
			throw new Error('CONCURRENTLY is only supported for PostgreSQL indexes')
		}

		try {
			const tokens = ['CREATE']
			if (options.unique) {
				tokens.push('UNIQUE')
			}
			tokens.push('INDEX')
			if (options.concurrently) {
				tokens.push('CONCURRENTLY')
			}
			if (ifNotExists) {
				tokens.push('IF NOT EXISTS')
			}
			tokens.push(indexName)
			tokens.push('ON', tableName)
			if (this.dbType === 'postgres' && options.using) {
				tokens.push('USING', options.using)
			}

			const columnList = normalizedColumns
				.map(column => `${column.name}${column.order ? ` ${column.order}` : ''}`)
				.join(', ')
			let query = `${tokens.join(' ')} (${columnList})`
			if (this.dbType === 'mysql' && options.using) {
				query += ` USING ${options.using.toUpperCase()}`
			}
			if (options.include?.length) {
				query += ` INCLUDE (${options.include.join(', ')})`
			}
			if (options.where) {
				query += ` WHERE ${options.where}`
			}

			await this.executeQuery(query)
		} catch (err) {
			logger.info('Error creating index: ', err)
			throw err
		}
	}

	public async dropIndex(
		tableName: string,
		indexName: string,
		options: DropIndexOptions = {},
	): Promise<void> {
		assertValidIdentifier(tableName, 'table name')
		assertValidIdentifier(indexName, 'index name')

		const ifExists = options.ifExists ?? this.dbType !== 'mysql'
		if (this.dbType === 'mysql') {
			if (ifExists) {
				throw new Error('MySQL DROP INDEX does not support IF EXISTS')
			}
			if (options.concurrently) {
				throw new Error('MySQL DROP INDEX does not support CONCURRENTLY')
			}
		}
		if (this.dbType !== 'postgres' && options.concurrently) {
			throw new Error('CONCURRENTLY is only supported for PostgreSQL indexes')
		}

		let query: string
		if (this.dbType === 'mysql') {
			query = `DROP INDEX ${indexName} ON ${tableName}`
		} else {
			const tokens = ['DROP INDEX']
			if (options.concurrently) {
				tokens.push('CONCURRENTLY')
			}
			if (ifExists) {
				tokens.push('IF EXISTS')
			}
			tokens.push(indexName)
			query = tokens.join(' ')
		}

		try {
			await this.executeQuery(query)
		} catch (err) {
			logger.info('Error dropping index: ', err)
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
			return await this.alterTable(tableName, alterClauses)
		} catch (err) {
			logger.info('Error adding table columns: ', err)
			throw err
		}
	}

	/**
	 * Runs one or more trusted, engine-specific ALTER TABLE clauses.
	 */
	public async alterTable(
		tableName: string,
		alterations: string | string[],
	): Promise<boolean> {
		assertValidIdentifier(tableName, 'table name')
		const clauses = typeof alterations === 'string' ? [alterations] : alterations

		if (!Array.isArray(clauses) || clauses.length === 0) {
			throw new Error('alterTable requires at least one alteration')
		}
		for (const clause of clauses) {
			if (typeof clause !== 'string' || clause.trim().length === 0) {
				throw new Error('ALTER TABLE clauses must be non-empty strings')
			}
			await this.executeQuery(`ALTER TABLE ${tableName} ${clause}`)
		}

		return true
	}

	public async dropColumn(tableName: string, columnName: string): Promise<boolean> {
		assertValidIdentifier(columnName, 'column')
		return this.alterTable(tableName, `DROP COLUMN ${columnName}`)
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

		const rows = (result ?? []) as Array<Record<string, unknown>>
		if (this.dbType === 'sqlite') {
			return rows as unknown as tableInternalSchema[]
		} else if (this.dbType === 'postgres') {
			// Map to tableInternalSchema
			return rows.map(row => ({
				name: row.name,
				type: 'table',
			})) as unknown as tableInternalSchema[]
		} else {
			// MySQL returns { Tables_in_dbname: 'tablename' }
			return rows.map(row => ({
				name: Object.values(row)[0],
				type: 'table',
			})) as unknown as tableInternalSchema[]
		}
	}

	public async getTableSchema(tableName: string): Promise<tableRowSchema[]> {
		assertValidIdentifier(tableName, 'table name')
		if (this.dbType === 'sqlite') {
			const query = `PRAGMA table_info(${tableName})`
			return await this.executeQuery(query)
		} else if (this.dbType === 'postgres') {
			const query = `SELECT column_name as name, data_type as type, is_nullable as notnull, column_default as dflt_value FROM information_schema.columns WHERE table_name = ?`
			const rows = (await this.executeQuery(query, [tableName])) as Array<
				Record<string, unknown>
			>
			// Map to tableRowSchema
			return rows.map(row => ({
				name: row.name,
				type: row.type,
				notnull: row.notnull === 'NO' ? 1 : 0,
				dflt_value: row.dflt_value,
				pk: 0, // Hard to get PK simply in one query without joins
				cid: 0,
			})) as unknown as tableRowSchema[]
		} else {
			// MySQL
			const query = `DESCRIBE ${tableName}`
			const rows = (await this.executeQuery(query)) as Array<Record<string, unknown>>
			return rows.map(row => ({
				name: row.Field,
				type: row.Type,
				notnull: row.Null === 'NO' ? 1 : 0,
				dflt_value: row.Default,
				pk: row.Key === 'PRI' ? 1 : 0,
				cid: 0,
			})) as unknown as tableRowSchema[]
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
		const rows = (await this.executeQuery(query, whereArgs)) as Array<
			Record<string, unknown>
		>
		const total = rows[0]?.total ?? rows[0]?.['COUNT(*)'] ?? 0
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

		const result = await this.executeQuery(query, whereArgs)
		return result as T[]
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
