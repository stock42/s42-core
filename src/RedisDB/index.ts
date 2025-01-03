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

			this.retryConnection(this.redis);
      this.retryConnection(this.redisSub);
      this.retryConnection(this.redisPub);
		} catch (err) {
			console.info('Error instance redis')
		}
	}

	async hset(key: string, value: Record<string, any>): Promise<void> {
		await this.redis.hset(key, value)
	}

	async hget(key: string, subkey: string): Promise<string | null> {
		return await this.redis.hget(key, subkey)
	}

	async hgetall(key: string): Promise<Record<string, string>> {
		return await this.redis.hgetall(key)
	}

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

	unsubscribe(channelName: string): void {
		try {
			this.redisSub.unsubscribe(channelName)
		} catch (error) {
			throw new Error(`Error unsubscribing from channel "${channelName}": ${error}`)
		}
	}

	publish(channelName: string, payload: Record<string, any>): void {
		try {
			this.redisPub.publish(channelName, JSON.stringify(payload))
		} catch (error) {
			console.error(`Error publishing to channel "${channelName}":`, error)
		}
	}

	public static getInstance(connectionURI: string = 'localhost'): RedisClient {
		if (!RedisClient.instance) {
			RedisClient.instance = new RedisClient(connectionURI)
		}
		return RedisClient.instance
	}

	public async isConnected(): Promise<boolean> {
    try {
        await this.redis.ping();
        return true;
    } catch {
        return false;
    }
	}

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


	private async retryConnection(redisInstance: TypeRedis, retries: number = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
        try {
            await redisInstance.ping();
            return;
        } catch (error) {
            console.warn(`Retrying Redis connection (${i + 1}/${retries})...`);
            if (i === retries - 1) throw error;
        }
    }
}
}
