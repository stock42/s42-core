// services/MongoDBStorage.ts
import type { Filter, IndexSpecification } from 'mongodb'
import { Dependencies } from '@/Dependencies'
import { MongoClient } from '@/MongoDB'

export type TypeDocument = {
	uuid: string
	_added: Date
	_v: number
	_n: number
}

export type TypeOptionsUpdate = {
	bypassDocumentValidation?: boolean
	upsert?: boolean
}

export type TypePaginationOptions = {
	page: number
	limit: number
	sort?: object
	projection?: object
}

export type TypePaginationResponse<T> = {
	docs: T[]
	count: number
	limit: number
	page: number
	totalPages: number
}

export class MongoDBStorage {
	protected readonly db: MongoClient
	protected readonly collectionName: string

	constructor(collectionName: string) {
		this.db = Dependencies.get<MongoClient>('db') as MongoClient
		if (!this.db) {
			throw new Error('MongoDB client not found in dependencies')
		}
		this.collectionName = collectionName
	}

	public getObjectId() {
		return Dependencies.get<MongoClient>('db')?.ObjectId!
	}

	static createIndex(collectionName: string, index: IndexSpecification) {
		return Dependencies.get<MongoClient>('db')
			?.getCollection(collectionName)
			.createIndex(index)
	}

	protected _insert<T>(data: T & { getData: () => Partial<T>; getUUID: () => string }) {
		return this.db.getCollection(this.collectionName).insertOne({
			data: data.getData(),
			uuid: data.getUUID(),
			_added: new Date(),
			_v: 0,
			_n: 0,
		})
	}

	protected _insertFlat<T>(
		data: T & { getData: () => Partial<T>; getUUID: () => string },
	) {
		return this.db.getCollection(this.collectionName).insertOne({
			...data.getData(),
			uuid: data.getUUID(),
			_added: new Date(),
			_v: 0,
			_n: 0,
		})
	}

	static async _distinct(
		collectionName: string,
		field: string,
		filter: Filter<any> = {},
	): Promise<string[]> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).distinct(field, filter)
	}

	static async _aggregate(collectionName: string, pipeline: object[]): Promise<object[]> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).aggregate(pipeline).toArray()
	}

	static _insert<T>(
		collectionName: string,
		data: T & { getData: () => Partial<T>; getUUID: () => string },
	) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).insertOne({
			data: data.getData(),
			uuid: data.getUUID(),
			_added: new Date(),
			_v: 0,
			_n: 0,
		})
	}

	protected getCollection() {
		return this.db.getCollection(this.collectionName)
	}

	static async _findOne<T>(
		collectionName: string,
		query: object,
		projection?: object,
		sort?: { [key: string]: number },
	) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		const options: { projection?: object; sort?: object } = { projection, sort }
		const collection = db.getCollection(collectionName)
		const result = await collection.findOne<T>(query, options)
		return result
	}

	static async _count(collectionName: string, query?: object): Promise<number> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).countDocuments(query ?? {})
	}

	static async _find<T>(
		collectionName: string,
		query: object,
		projection?: object,
		sort?: object,
	) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		const options: { projection?: object; sort?: object } = {}
		if (projection) {
			options.projection = projection
		}
		if (sort) {
			options.sort = sort
		}
		return db.getCollection(collectionName).find(query, options).toArray() as Promise<T[]>
	}

	static async _getByUUID<T>(collectionName: string, uuid: string): Promise<T | null> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).findOne({ uuid }) as T
	}

	static async _update(
		collectionName: string,
		where: object,
		update: object,
		options?: TypeOptionsUpdate,
	) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient

		await db.getCollection(collectionName).updateMany(
			where,
			{
				$set: { ...update, updatedAt: new Date() },
				$inc: { _n: 1 },
			},
			options,
		)
	}

	static async _deleteOne(collectionName: string, query: object) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).deleteOne(query)
	}

	static async _deleteMany(collectionName: string, query: object) {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		return db.getCollection(collectionName).deleteMany(query)
	}

	static async _delete(collectionName: string, uuid: string): Promise<number> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		const result = await db.getCollection(collectionName).deleteOne({ uuid })
		return result.deletedCount
	}

	static async _search<T>(
		collectionName: string,
		query: object,
		fields: object | undefined,
		options: TypePaginationOptions,
	): Promise<{
		docs: { _id: string; _added: Date; data: T }[]
		count: number
		limit: number
		page: number
		totalPages: number
	}> {
		const db = Dependencies.get<MongoClient>('db') as MongoClient
		const result = await MongoClient.paginate(
			db.getCollection(collectionName),
			query,
			fields,
			options,
		)
		return result as {
			docs: { _id: string; _added: Date; data: T }[]
			count: number
			limit: number
			page: number
			totalPages: number
		}
	}
}
