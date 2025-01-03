import {
	MongoClient as MongoClientNative,
	ObjectId,
	type Db,
	type Collection,
	type Document,
} from 'mongodb'
import { type TypeMongoDBdatabaseConnection, type TypeMongoQueryPagination } from './types'

export class MongoClient {
	private static instance: MongoClient
	private mongoClient: MongoClientNative
	private db: Db | null = null
	private databaseName: string

	private constructor({
		connectionString = process.env?.MONGO_URI ?? '',
		database = process.env?.MONGO_DB ?? '',
	}: TypeMongoDBdatabaseConnection) {
		if (!connectionString) {
			throw new Error('MongoDB connection string is required.')
		}

		if (!database) {
			throw new Error('MongoDB database name is required.')
		}

		this.databaseName = database
		this.mongoClient = new MongoClientNative(connectionString)
	}

	public async connect(): Promise<void> {
		try {
			await this.mongoClient.connect()
			this.db = this.mongoClient.db(this.databaseName)
			console.info(`Connected to MongoDB: ${this.databaseName}`)
		} catch (error) {
			console.error('MongoDB connection error:', error)
			throw new Error('Failed to connect to MongoDB');
		}
	}

	public ObjectId(id: string): ObjectId {
		if (!ObjectId.isValid(id)) {
			throw new Error(`Invalid ObjectId: ${id}`);
		}
		return new ObjectId(id);
	}

	public async close(): Promise<void> {
		try {
			await this.mongoClient.close()
			console.info('MongoDB connection closed.')
		} catch (error) {
			console.error('Error closing MongoDB connection:', error)
		}
	}

	public getDB(): Db {
		if (!this.db) {
			throw new Error('Database not initialized. Call connect() first.')
		}
		return this.db
	}

	public getCollection<T extends Document>(colName: string): Collection<T> {
		return this.getDB().collection<T>(colName)
	}

	public static getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient {
		if (!MongoClient.instance) {
			MongoClient.instance = new MongoClient(connection)
		}
		return MongoClient.instance
	}

	public static async paginate<T>(
		collection: Collection,
		query: object = {},
		fields: object = {},
		options: TypeMongoQueryPagination = {},
	): Promise<{ docs: T[]; count: number; limit: number; page: number; totalPages: number }> {
		const opts = options.opts || {}
		const page = options.page ?? 1
		const defaultLimit = 30
		const limit = options.limit ?? defaultLimit
		const sort = options.sort ?? { added: -1 }

		if (page <= 0) {
			throw new Error('Page number must be greater than 0')
		}

		if (limit <= 0) {
			throw new Error('Limit must be greater than 0')
		}

		const count = await collection.countDocuments(query)

		const totalPages = Math.ceil(count / limit)

		const docs = await collection
			.find(query, { ...opts, projection: fields })
			.sort(sort)
			.skip(limit * (page - 1))
			.limit(limit)
			.toArray()

		return {
			docs,
			limit,
			count,
			page,
			totalPages,
		}
	}
}
