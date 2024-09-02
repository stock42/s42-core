import { type RedisInterface } from './Redis.interface.js';
export declare class RedisClient implements RedisInterface {
    private static instance;
    private redis;
    private redisSub;
    private redisPub;
    constructor(connectionURI: string);
    hset(key: string, value: object): Promise<void>;
    hget(key: string, subkey: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    subscribe<T>(channelName: string, callback: (payload: T) => void): void;
    unsubscribe(channelName: string): void;
    publish(channelName: string, payload: object): void;
    static getInstance(connectonURI?: string): RedisClient;
    close(): void;
}
