import { Database } from 'bun:sqlite'

export type TypeTableSchema = { [key: string]: string }

export type TypeSQLiteConnection = {
	type: 'file' | 'memory'
	filename?: string
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

	close() {
		try {
			this.database.close()
		} catch (err) {
			console.error('Error closing database:', err)
		}
	}

	public createTable(tableName: string, schema: TypeTableSchema) {
		try {
			const schemaEntries = Object.entries(schema)
				.map(([key, type]) => `${key} ${type}`)
				.join(', ')

			const query = `CREATE TABLE IF NOT EXISTS ${tableName} (
        key INTEGER PRIMARY KEY,
        value TEXT,
        ${schemaEntries}
      ) STRICT`

			this.database.run(query)
		} catch (err) {
			throw new Error(`Error creating table: ${String(err)}`)
		}
	}

	public dropTable(tableName: string) {
		try {
			const query = `DROP TABLE IF EXISTS ${tableName}`
			this.database.run(query)
		} catch (err) {
			throw new Error(`Error dropping table: ${String(err)}`)
		}
	}

	public delete(tableName: string, where: string, params: any[] = []) {
		try {
			const query = `DELETE FROM ${tableName} WHERE ${where}`
			this.database.run(query, ...params)
		} catch (err) {
			throw new Error(`Error deleting data: ${String(err)}`)
		}
	}

	public insert(tableName: string, data: { [key: string]: string }) {
		try {
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

	public select(tableName: string, where: string, params: any[] = []) {
		try {
			const query = `SELECT * FROM ${tableName} WHERE ${where} ORDER BY key`
			return this.database.query(query).all(...params)
		} catch (err) {
			throw new Error(`Error selecting data: ${String(err)}`)
		}
	}
}
