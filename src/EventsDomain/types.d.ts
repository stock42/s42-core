export type TypeEvent = {
	instances: string[]
	currentCursor: 0
}

export type TypeEventCommandRedis = {
	uuid: string
	eventName: string
	cmd: string
}
