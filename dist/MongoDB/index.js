import { MongoClient as MongoClientNative, ObjectId } from 'mongodb';
export class MongoClient {
    mongoClient;
    db;
    databaseName;
    static instance;
    constructor({ connectionString = process.env?.MONGO_URI ?? '', database = process.env?.MONGO_DB ?? '', }) {
        this.databaseName = database;
        this.mongoClient = new MongoClientNative(connectionString);
    }
    async connect() {
        try {
            await this.mongoClient.connect();
            this.db = this.mongoClient.db(this.databaseName);
            console.info('Connected to MongoDB');
        }
        catch (error) {
            console.error('MongoDB connection error:', error);
            process.exit(1);
        }
    }
    ObjectId(id) {
        return new ObjectId(id);
    }
    close() {
        MongoClient.instance.mongoClient.close();
        console.info('MongoDB Closed');
    }
    getDB() {
        return this.db;
    }
    getCollection(colName) {
        return this.db.collection(colName);
    }
    static getInstance({ connectionString = process.env?.MONGO_URI ?? '', database = process.env?.MONGO_DB ?? '', }) {
        if (!MongoClient.instance) {
            MongoClient.instance = new MongoClient({
                connectionString,
                database,
            });
        }
        return MongoClient.instance;
    }
}
