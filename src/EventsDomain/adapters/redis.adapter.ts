import type { EventsAdapter } from '../types.d.js'
import { RedisClient } from '../../RedisDB/index.js'

export class RedisEventsAdapter implements EventsAdapter {
	public readonly name = 'redis'
	private readonly redis: RedisClient

	constructor(redisInstance?: RedisClient) {
		this.redis = redisInstance ?? RedisClient.getInstance()
	}

	public publish(channel: string, payload: object): void {
		this.redis.publish(channel, payload)
	}

	public subscribe(channel: string, handler: (payload: any, channel: string) => void): void {
		this.redis.subscribe(channel, (payload: any) => {
			handler(payload, channel)
		})
	}

	public unsubscribe(channel: string): void {
		this.redis.unsubscribe(channel)
	}

	public close(): void {
		this.redis.close()
	}
}
