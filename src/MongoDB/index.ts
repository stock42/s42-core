import {
	MongoClient as MongoClientNative,
	ObjectId,
	type Db,
	type Collection,
} from 'mongodb'
import { type TypeMongoDBdatabaseConnection } from './types'

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

	/**
	 * Connects to the MongoDB database.
	 */
	public async connect(): Promise<void> {
		try {
			await this.mongoClient.connect()
			this.db = this.mongoClient.db(this.databaseName)
			console.info(`Connected to MongoDB: ${this.databaseName}`)
		} catch (error) {
			console.error('MongoDB connection error:', error)
			process.exit(1)
		}
	}

	/**
	 * Returns a MongoDB ObjectId instance.
	 * @param id - The string representation of the ObjectId.
	 * @returns An ObjectId instance.
	 */
	public ObjectId(id: string): ObjectId {
		return new ObjectId(id)
	}

	/**
	 * Closes the MongoDB connection.
	 */
	public async close(): Promise<void> {
		try {
			await this.mongoClient.close()
			console.info('MongoDB connection closed.')
		} catch (error) {
			console.error('Error closing MongoDB connection:', error)
		}
	}

	/**
	 * Returns the connected database instance.
	 * @returns The connected Db instance.
	 */
	public getDB(): Db {
		if (!this.db) {
			throw new Error('Database not initialized. Call connect() first.')
		}
		return this.db
	}

	/**
	 * Returns a MongoDB collection by name.
	 * @param colName - The name of the collection.
	 * @returns The MongoDB Collection instance.
	 */
	public getCollection<T>(colName: string): Collection<T> {
		return this.getDB().collection<T>(colName)
	}

	/**
	 * Returns a singleton instance of the MongoClient.
	 * @param connection - The connection configuration.
	 * @returns The MongoClient singleton instance.
	 */
	public static getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient {
		if (!MongoClient.instance) {
			MongoClient.instance = new MongoClient(connection)
		}
		return MongoClient.instance
	}
}
