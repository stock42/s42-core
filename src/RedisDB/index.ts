import Redis, { type Redis as TypeRedis } from 'ioredis'
import { type RedisInterface } from './Redis.interface.js'

export class RedisClient implements RedisInterface {
	private static instance: RedisClient
	private redis!: TypeRedis
	private redisSub!: TypeRedis
	private redisPub!: TypeRedis

	private constructor(connectionURI: string) {
		try {
			this.redis = new Redis(connectionURI)
			this.redisSub = new Redis(connectionURI)
			this.redisPub = new Redis(connectionURI)
		} catch (err) {
			console.info('Error instance redis')
		}
	}

	/**
	 * Sets a hash key-value pair in Redis.
	 * @param key - The key for the hash.
	 * @param value - The object to store in the hash.
	 */
	async hset(key: string, value: Record<string, any>): Promise<void> {
		await this.redis.hset(key, value)
	}

	/**
	 * Retrieves a value from a Redis hash by key and subkey.
	 * @param key - The hash key.
	 * @param subkey - The specific field in the hash.
	 * @returns The value as a string or null.
	 */
	async hget(key: string, subkey: string): Promise<string | null> {
		return await this.redis.hget(key, subkey)
	}

	/**
	 * Retrieves all key-value pairs from a Redis hash.
	 * @param key - The hash key.
	 * @returns An object containing all key-value pairs.
	 */
	async hgetall(key: string): Promise<Record<string, string>> {
		return await this.redis.hgetall(key)
	}

	/**
	 * Subscribes to a Redis channel and listens for messages.
	 * @param channelName - The name of the channel to subscribe to.
	 * @param callback - The function to call with the message payload.
	 */
	subscribe<T>(channelName: string, callback: (payload: T) => void): void {
		try {
			this.redisSub.subscribe(channelName)
		} catch (error) {
			throw new Error(`Error subscribing to channel "${channelName}": ${error}`)
		}

		this.redisSub.on('message', (channel: string, message: string) => {
			if (channel === channelName) {
				try {
					callback(JSON.parse(message) as T)
				} catch (error) {
					console.error(`Error parsing message from channel "${channelName}":`, error)
				}
			}
		})
	}

	/**
	 * Unsubscribes from a Redis channel.
	 * @param channelName - The name of the channel to unsubscribe from.
	 */
	unsubscribe(channelName: string): void {
		try {
			this.redisSub.unsubscribe(channelName)
		} catch (error) {
			throw new Error(`Error unsubscribing from channel "${channelName}": ${error}`)
		}
	}

	/**
	 * Publishes a message to a Redis channel.
	 * @param channelName - The name of the channel to publish to.
	 * @param payload - The payload to send.
	 */
	publish(channelName: string, payload: Record<string, any>): void {
		try {
			this.redisPub.publish(channelName, JSON.stringify(payload))
		} catch (error) {
			console.error(`Error publishing to channel "${channelName}":`, error)
		}
	}

	/**
	 * Retrieves the singleton instance of RedisClient.
	 * @param connectionURI - The connection URI for Redis.
	 * @returns The RedisClient instance.
	 */
	public static getInstance(connectionURI: string = 'localhost'): RedisClient {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient(connectionURI)
		}
		return RedisClient.instance
	}

	/**
	 * Closes all Redis connections.
	 */
	public close(): void {
		try {
			this.redis.quit()
			this.redisSub.quit()
			this.redisPub.quit()
			console.log('Redis connections closed')
		} catch (error) {
			console.error('Error closing Redis connections:', error)
		}
	}
}
