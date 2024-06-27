import Redis from 'ioredis';
export class RedisClient {
    static instance;
    redis;
    redisSub;
    redisPub;
    constructor(connectionURI) {
        this.redis = new Redis(connectionURI);
        this.redisSub = new Redis(connectionURI);
        this.redisPub = new Redis(connectionURI);
    }
    async hset(key, value) {
        await this.redis.hset(key, value);
    }
    async hget(key, subkey) {
        return await this.redis.hget(key, subkey);
    }
    async hgetall(key) {
        return await this.redis.hgetall(key);
    }
    subscribe(channelName, callback) {
        try {
            this.redisSub.subscribe(channelName);
        }
        catch (err) {
            throw new Error(`Error subscribe: ${channelName}`);
        }
        this.redisSub.on('message', (channel, message) => {
            if (channel === channelName) {
                callback(JSON.parse(message));
            }
        });
    }
    publish(channelName, payload) {
        this.redisPub.publish(channelName, JSON.stringify(payload));
    }
    static getInstance(connectonURI = 'localhost') {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient(connectonURI);
        }
        return RedisClient.instance;
    }
    close() {
        RedisClient.instance.redis.quit();
        console.log('Connection to Redis closed');
    }
}
