import { type RedisClient } from '../RedisDB'
import { type EventsDomainsInterface } from './eventsDomainInterface'
import { type TypeEvent, type TypeEventCommandRedis } from './types'

export class EventsDomain implements EventsDomainsInterface {
	private static instance: EventsDomain
	private readonly channelNameToSubscribe = '$EventsDomain$'
	private readonly processUUID: string
	private readonly registeredEvents: Record<string, TypeEvent> = {}
	private readonly localEventsRegistered: string[] = []
	private readonly redisInstance: RedisClient
	private intervalId: NodeJS.Timeout | null = null

	private constructor(redisInstance: RedisClient, uuid: string) {
		this.redisInstance = redisInstance
		this.processUUID = uuid
		this.receiveCommandsFromRedis()
		this.notifyRegisteredEvents()
	}

	/**
	 * Sends a command to the Redis channel for event domain communication.
	 */
	private sendCommandToRedis(command: TypeEventCommandRedis): void {
		this.redisInstance.publish(this.channelNameToSubscribe, command)
	}

	/**
	 * Periodically notifies Redis of all registered events for this instance.
	 */
	private notifyRegisteredEvents(): void {
		this.intervalId = setInterval(() => {
			for (const eventName of this.localEventsRegistered) {
				this.sendCommandToRedis({
					uuid: this.processUUID,
					eventName,
					cmd: 'registerEvent',
				})
			}
		}, 5000)
	}

	/**
	 * Closes the EventsDomain instance, clearing intervals and publishing a cleanup command.
	 */
	public close(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
		}

		this.redisInstance.publish(this.channelNameToSubscribe, {
			uuid: this.processUUID,
			cmd: 'removeAllInstanceListeners',
			eventName: '*',
		})

		console.info('EventsDomain closed.')
	}

	/**
	 * Subscribes to commands from the Redis channel and processes them.
	 */
	private receiveCommandsFromRedis(): void {
		this.redisInstance.subscribe<TypeEventCommandRedis>(
			this.channelNameToSubscribe,
			(eventCommand: TypeEventCommandRedis) => {
				if (eventCommand.uuid === this.processUUID) {
					return
				}

				switch (eventCommand.cmd) {
					case 'registerEvent':
						this.registerEventListenerInstance(eventCommand.eventName, eventCommand.uuid)
						break
					case 'removeAllInstanceListeners':
						this.removeAllInstanceListeners(eventCommand.uuid)
						break
				}
			},
		)
	}

	/**
	 * Returns all registered events for the instance.
	 */
	public getAllRegisteredEvents(): Record<string, TypeEvent> {
		return this.registeredEvents
	}

	/**
	 * Generates a unique Redis channel name for an event.
	 */
	private getInternalEventChannelName(
		eventName: string,
		uuid: string = this.processUUID,
	): string {
		return `${eventName}-${uuid}`
	}

	/**
	 * Registers a listener for a specific event.
	 */
	public listenEvent<TypePayload>(
		eventName: string,
		callback: (payload: TypePayload) => void,
	): void {
		if (!this.isEventRegistered(eventName)) {
			this.registerEvent(eventName)
		}

		if (!this.localEventsRegistered.includes(eventName)) {
			this.localEventsRegistered.push(eventName)
		}

		this.redisInstance.subscribe(this.getInternalEventChannelName(eventName), callback)
		this.registerEventListenerInstance(eventName, this.processUUID)
		this.sendCommandToRedis({
			uuid: this.processUUID,
			eventName,
			cmd: 'registerEvent',
		})
	}

	/**
	 * Registers an event.
	 */
	private registerEvent(eventName: string): void {
		if (!this.isEventRegistered(eventName)) {
			this.registeredEvents[eventName] = {
				instances: [],
				currentCursor: 0,
			}
		}
	}

	/**
	 * Checks if an event is registered.
	 */
	private isEventRegistered(eventName: string): boolean {
		return !!this.registeredEvents[eventName]
	}

	/**
	 * Registers an event listener for a specific instance.
	 */
	public registerEventListenerInstance(eventName: string, instanceId: string): void {
		if (!this.isEventRegistered(eventName)) {
			this.registerEvent(eventName)
		}

		const instances = this.registeredEvents[eventName].instances
		if (!instances.includes(instanceId)) {
			instances.push(instanceId)
		}
	}

	/**
	 * Removes all event listeners for a specific instance.
	 */
	public removeAllInstanceListeners(instanceId: string): void {
		for (const eventName in this.registeredEvents) {
			const event = this.registeredEvents[eventName]
			event.instances = event.instances.filter(id => id !== instanceId)
		}
	}

	/**
	 * Returns the next instance ID to handle an event, using round-robin.
	 */
	private getNextInstanceId(eventName: string): string {
		const event = this.registeredEvents[eventName]
		const nextInstanceId = event.instances[event.currentCursor]
		event.currentCursor = (event.currentCursor + 1) % event.instances.length
		return nextInstanceId
	}

	/**
	 * Emits an event, sending the payload to the next instance in the round-robin.
	 */
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

	/**
	 * Returns the singleton instance of EventsDomain.
	 */
	public static getInstance(redisInstance: RedisClient, uuid: string): EventsDomain {
		if (!EventsDomain.instance) {
			EventsDomain.instance = new EventsDomain(redisInstance, uuid)
		}
		return EventsDomain.instance
	}
}
