import { RedisClient as BunRedisClient } from 'bun'
import { type RedisInterface } from './Redis.interface.js'

export class RedisClient implements RedisInterface {
	private static instance: RedisClient
	private readonly redis!: BunRedisClient
	private readonly redisSub!: BunRedisClient
	private readonly redisPub!: BunRedisClient

	private constructor(connectionURI?: string) {
		this.redis = RedisClient.createClient(connectionURI)
		this.redisSub = RedisClient.createClient(connectionURI)
		this.redisPub = RedisClient.createClient(connectionURI)
	}

	async connect(): Promise<void> {
		await this.redis.connect()
		await this.redisSub.connect()
		await this.redisPub.connect()
	}

	async hset(key: string, value: object): Promise<void> {
		const args: string[] = []
		for (const [field, rawValue] of Object.entries(value as Record<string, unknown>)) {
			const serialized = RedisClient.serializeHashValue(rawValue)
			if (serialized === undefined) {
				continue
			}
			args.push(field, serialized)
		}

		if (!args.length) {
			return
		}

		await this.redis.send('HSET', [key, ...args])
	}

	async hget(key: string, subkey: string): Promise<string | null> {
		return await this.redis.hget(key, subkey)
	}

	async hgetall(key: string): Promise<Record<string, string> | null> {
		return await this.redis.hgetall(key)
	}

	subscribe<T>(channelName: string, callback: (payload: T) => void): void {
		void this.redisSub
			.subscribe(channelName, (message: string, channel: string) => {
				if (channel !== channelName) {
					return
				}

				try {
					callback(JSON.parse(message) as T)
				} catch (error) {
					console.error(`Error parsing message from channel "${channelName}":`, error)
				}
			})
			.catch(error => {
				console.error(`Error subscribing to channel "${channelName}":`, error)
			})
	}

	unsubscribe(channelName: string): void {
		void this.redisSub
			.unsubscribe(channelName)
			.catch(error =>
				console.error(`Error unsubscribing from channel "${channelName}":`, error),
			)
	}

	publish(channelName: string, payload: object): void {
		let message: string
		try {
			message = JSON.stringify(payload)
		} catch (error) {
			console.error(`Error serializing payload for channel "${channelName}":`, error)
			return
		}

		void this.redisPub
			.publish(channelName, message)
			.catch(error =>
				console.error(`Error publishing to channel "${channelName}":`, error),
			)
	}

	public static getInstance(connectionURI?: string): RedisClient {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient(connectionURI)
		}
		return RedisClient.instance
	}

	public async isConnected(): Promise<boolean> {
		try {
			await this.redis.send('PING', [])
			return true
		} catch {
			return false
		}
	}

	public close(): void {
		try {
			this.redis.close()
			this.redisSub.close()
			this.redisPub.close()
			console.log('Redis connections closed')
		} catch (error) {
			console.error('Error closing Redis connections:', error)
		}
	}

	public async counter(key: string): Promise<number> {
		const exists = await this.redis.exists(key)
		if (!exists) {
			await this.redis.set(key, '0')
		}
		return await this.redis.incr(key)
	}

	public async setCache(key: string, value: object): Promise<void> {
		await this.redis.set(key, JSON.stringify(value))
	}

	public async getCache<T>(key: string): Promise<T | null> {
		const cachedValue = await this.redis.get(key)
		if (!cachedValue) {
			return null
		}

		try {
			return JSON.parse(cachedValue) as T
		} catch {
			return null
		}
	}

	private static createClient(connectionURI?: string): BunRedisClient {
		const resolvedURI = RedisClient.resolveConnectionURI(connectionURI)
		return resolvedURI ? new BunRedisClient(resolvedURI) : new BunRedisClient()
	}

	private static resolveConnectionURI(connectionURI?: string): string | undefined {
		const envURI = connectionURI || process.env.REDIS_URL || process.env.VALKEY_URL
		if (!envURI) {
			return undefined
		}

		if (envURI.includes('://')) {
			return envURI
		}

		const hasPort = envURI.includes(':')
		return `redis://${envURI}${hasPort ? '' : ':6379'}`
	}

	private static serializeHashValue(value: unknown): string | undefined {
		if (value === undefined) {
			return undefined
		}

		if (typeof value === 'string') {
			return value
		}

		return JSON.stringify(value)
	}

	private async retryConnection(
		redisInstance: BunRedisClient,
		retries: number = 3,
	): Promise<void> {
		for (let i = 0; i < retries; i++) {
			try {
				await redisInstance.connect()
				return
			} catch (error) {
				console.warn(`Retrying Redis connection (${i + 1}/${retries})...`)
				if (i === retries - 1) {
					throw error
				}
			}
		}
	}
}
