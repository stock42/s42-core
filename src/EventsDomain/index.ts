import { type RedisClient } from '../index.js'
import { type EventsDomainsInterface } from './eventsDomainInterface.js'

import { type TypeEvent, type TypeEventCommandRedis } from './types'

export class EventsDomain implements EventsDomainsInterface {
	private readonly channelNameToSubscribe = '$EventsDomain$'
	private processUUID: string
	private registeredEvents: { [key: string]: TypeEvent } = {}
	private localEventsRegistered: Array<string> = []
	private static instance: EventsDomain
	private redisInstance: RedisClient
	private intervalId: any

	constructor(redisInstance: RedisClient, uuid: string) {
		this.redisInstance = redisInstance
		this.processUUID = uuid
		this.receiveCommandsFromRedis()
		this.notifyMyAllEventsRegistered()
	}

	private sendCommandToRedis(command: TypeEventCommandRedis) {
		this.redisInstance.publish(this.channelNameToSubscribe, command)
	}

	private notifyMyAllEventsRegistered() {
		this.intervalId = setInterval(() => {
			this.localEventsRegistered.forEach(eventName => {
				this.sendCommandToRedis({
					uuid: this.processUUID,
					eventName,
					cmd: 'registerEvent',
				})
			})
		}, 5000)
	}

	public close() {
		clearInterval(this.intervalId)

		EventsDomain.instance.redisInstance.publish(
			EventsDomain.instance.channelNameToSubscribe,
			{
				uuid: EventsDomain.instance.processUUID,
				cmd: 'removeAllInstanceListeners',
				eventName: '*',
			},
		)

		console.info('eventsCommand closed')
	}

	private receiveCommandsFromRedis() {
		this.redisInstance.subscribe<TypeEventCommandRedis>(
			this.channelNameToSubscribe,
			(eventCommand: TypeEventCommandRedis) => {
				if (eventCommand.uuid === this.processUUID) {
					return false
				}

				if (eventCommand?.cmd === 'registerEvent') {
					this.registerEventListenerInstance(eventCommand.eventName, eventCommand.uuid)
				}

				if (eventCommand?.cmd === 'removeAllInstanceListeners') {
					this.removeAllInstanceListeners(eventCommand.uuid)
				}
			},
		)
	}

	public getAllRegisteredEvents() {
		return this.registeredEvents
	}

	private getInternalEventChannelName(
		eventName: string,
		uuid: string = this.processUUID,
	): string {
		return `${eventName}-${uuid}`
	}

	public listenEvent<TypePayload>(
		eventName: string,
		callback: (payload: TypePayload) => void,
	): void {
		if (!this.isEventRegistered(eventName)) {
			this.registerEvent(eventName)
			this.localEventsRegistered.push(eventName)
			this.redisInstance.subscribe(this.getInternalEventChannelName(eventName), callback)
			this.registerEventListenerInstance(eventName, this.processUUID)
			this.sendCommandToRedis({
				uuid: this.processUUID,
				eventName,
				cmd: 'registerEvent',
			})
		}
	}

	private registerEvent(eventName: string): void {
		if (!this.isEventRegistered(eventName)) {
			this.registeredEvents[eventName] = {
				instances: [],
				currentCursor: 0,
			}
		}
	}

	private isEventRegistered(eventName: string): boolean {
		return !!this.registeredEvents[eventName]
	}

	public registerEventListenerInstance(eventName: string, instanceId: string) {
		if (!this.isEventRegistered(eventName)) {
			this.registerEvent(eventName)
		}

		if (this.registeredEvents[eventName].instances.indexOf(instanceId) === -1) {
			this.registeredEvents[eventName].instances.push(instanceId)
		}
	}

	public removeAllInstanceListeners(instanceId: string): void {
		for (const eventName in this.registeredEvents) {
			const event = this.registeredEvents[eventName]
			console.info('event: ', event)
			event.instances = event.instances.filter(id => id !== instanceId)
			this.registeredEvents[eventName] = event
		}
	}

	static getInstance(redisInstance: RedisClient, uuid: string): EventsDomain {
		if (!this.instance) {
			this.instance = new EventsDomain(redisInstance, uuid)
		}
		return this.instance
	}

	private getNextInstanceId(eventName: string): string {
		if (
			this.registeredEvents[eventName].currentCursor >=
			this.registeredEvents[eventName].instances.length
		) {
			this.registeredEvents[eventName].currentCursor = 0
		}
		const nextInstanceId =
			this.registeredEvents[eventName].instances[
				this.registeredEvents[eventName].currentCursor
			]
		this.registeredEvents[eventName].currentCursor++
		return nextInstanceId
	}

	public emitEvent(eventName: string, payload: object): boolean {
		if (!this.isEventRegistered(eventName)) {
			return false
		}
		const nextInstanceId = this.getNextInstanceId(eventName)

		this.redisInstance.publish(
			this.getInternalEventChannelName(eventName, nextInstanceId),
			payload,
		)
		return true
	}
}
