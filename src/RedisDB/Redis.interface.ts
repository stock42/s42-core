export interface RedisInterface {
	close: () => void
	hset: (key: string, value: object) => Promise<void>
	hget: (key: string, subkey: string) => Promise<string | null>
	hgetall: (key: string) => Promise<Record<string, string>>
	subscribe: (channelName: string, callback: (payload: object) => void) => void
	unsubscribe: (channelName: string) => void
	publish: (channelName: string, payload: object) => void
	isConnected: () => Promise<boolean>
	counter: (key: string) => Promise<number>
	setCache: (key: string, value: object) => Promise<void>
	getCache: <T>(key: string) => Promise<T | null>
}
