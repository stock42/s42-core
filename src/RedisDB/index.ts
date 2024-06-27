import Redis, { type Redis as TypeRedis } from 'ioredis'

import { type RedisInterface } from './Redis.interface.js'

export class RedisClient implements RedisInterface {
	private static instance: RedisClient
	private redis: TypeRedis
	private redisSub: TypeRedis
	private redisPub: TypeRedis

	constructor(connectionURI: string) {
		this.redis = new Redis(connectionURI)
		this.redisSub = new Redis(connectionURI)
		this.redisPub = new Redis(connectionURI)
	}

	async hset(key: string, value: object) {
		await this.redis.hset(key, value)
	}

	async hget(key: string, subkey: string) {
		return await this.redis.hget(key, subkey)
	}

	async hgetall(key: string) {
		return await this.redis.hgetall(key)
	}

	subscribe<T>(channelName: string, callback: (payload: T) => void) {
		try {
			this.redisSub.subscribe(channelName)
		} catch (err) {
			throw new Error(`Error subscribe: ${channelName}`)
		}

		this.redisSub.on('message', (channel: string, message: string) => {
			if (channel === channelName) {
				callback(JSON.parse(message) as T)
			}
		})
	}

	publish(channelName: string, payload: object) {
		this.redisPub.publish(channelName, JSON.stringify(payload))
	}

	public static getInstance(connectonURI: string = 'localhost') {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient(connectonURI)
		}
		return RedisClient.instance
	}

	public close() {
		RedisClient.instance.redis.quit()
		console.log('Connection to Redis closed')
	}
}
