import { ObjectId } from 'mongodb';
import { type TypeMongoDBdatabaseConnection } from './types';
export declare class MongoClient {
    private mongoClient;
    private db;
    private databaseName;
    static instance: MongoClient;
    constructor({ connectionString, database, }: TypeMongoDBdatabaseConnection);
    connect(): Promise<void>;
    ObjectId(id: string): ObjectId;
    close(): void;
    getDB(): any;
    getCollection(colName: string): any;
    static getInstance({ connectionString, database, }: TypeMongoDBdatabaseConnection): MongoClient;
}
