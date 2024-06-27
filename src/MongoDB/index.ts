import { MongoClient as MongoClientNative, ObjectId } from 'mongodb'

import { type TypeMongoDBdatabaseConnection } from './types'

export class MongoClient {
	private mongoClient: MongoClientNative
	private db: any
	private databaseName: string
	public static instance: MongoClient
	constructor({
		connectionString = process.env?.MONGO_URI ?? '',
		database = process.env?.MONGO_DB ?? '',
	}: TypeMongoDBdatabaseConnection) {
		this.databaseName = database
		this.mongoClient = new MongoClientNative(connectionString)
	}

	public async connect() {
		try {
			await this.mongoClient.connect()
			this.db = this.mongoClient.db(this.databaseName)
			console.info('Connected to MongoDB')
		} catch (error) {
			console.error('MongoDB connection error:', error)
			process.exit(1)
		}
	}

	public ObjectId(id: string) {
		return new ObjectId(id)
	}

	public close() {
		MongoClient.instance.mongoClient.close()
		console.info('MongoDB Closed')
	}

	public getDB() {
		return this.db
	}

	public getCollection(colName: string) {
		return this.db.collection(colName)
	}

	public static getInstance({
		connectionString = process.env?.MONGO_URI ?? '',
		database = process.env?.MONGO_DB ?? '',
	}: TypeMongoDBdatabaseConnection) {
		if (!MongoClient.instance) {
			MongoClient.instance = new MongoClient({
				connectionString,
				database,
			})
		}
		return MongoClient.instance
	}
}
