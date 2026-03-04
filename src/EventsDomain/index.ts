import type { RedisClient } from '../RedisDB'
import type { EventsDomainsInterface } from './eventsDomainInterface'
import type {
	EventEmitInput,
	EventListenInput,
	EventType,
	EventsAdapter,
	TypeEvent,
	TypeEventClusterListeners,
	TypeEventCommand,
} from './types.d.js'
import { RedisEventsAdapter } from './adapters/redis.adapter.js'

type LocalHandler = {
	handler: (event: EventType) => void | Promise<void>
	moduleName: string
}

const CONTROL_CHANNEL = '$$S42-EVENTS-REGISTRY$$'
const GLOBAL_DEBUG_EVENT = '$$GLOBAL-S42-EVENTS-EMIT$$'

export class EventsDomain implements EventsDomainsInterface {
	private static instance: EventsDomain
	private adapter: EventsAdapter
	private readonly processUUID: string
	private readonly clusterId: string
	private readonly registeredEvents: Record<string, TypeEvent> = {}
	private readonly localHandlers = new Map<string, LocalHandler[]>()
	private readonly localListenerRegistry = new Map<string, Map<string, boolean>>()
	private readonly localEmitterRegistry = new Map<string, string>()
	private readonly subscribedChannels = new Set<string>()
	private intervalId: NodeJS.Timer | null = null

	private constructor(redisInstance?: RedisClient, uuid?: string, clusterId?: string) {
		this.processUUID = uuid ?? Bun.randomUUIDv7()
		this.clusterId = EventsDomain.resolveClusterId(clusterId)
		this.adapter = new RedisEventsAdapter(redisInstance)
		this.ensureEvent(GLOBAL_DEBUG_EVENT, true)
		this.registerEmitterInternal(GLOBAL_DEBUG_EVENT, 'S42')
		this.subscribeControlChannel()
		this.startHeartbeat()
	}

	public setAdapter(adapterHandle: EventsAdapter): void {
		if (!adapterHandle) {
			throw new Error('Events adapter is required')
		}
		this.adapter = adapterHandle
		this.resubscribeAll()
	}

	public listen(
		input: EventListenInput,
		handler?: (event: EventType) => void | Promise<void>,
		moduleName?: string,
	): void {
		const normalizedName = EventsDomain.normalizeEventName(input.eventName, moduleName)
		if (!EventsDomain.isValidEventName(normalizedName)) {
			throw new Error(`Invalid event name "${normalizedName}". Expected format A.B.C`)
		}

		const resolvedModule = EventsDomain.normalizeModuleName(
			moduleName ?? EventsDomain.getModuleFromEventName(normalizedName),
		)
		const multiple = input.multiple ?? false

		this.registerListenerLocal(normalizedName, resolvedModule, multiple, handler)
		this.sendCommand({
			type: 'registerListener',
			eventName: normalizedName,
			clusterId: this.clusterId,
			instanceId: this.processUUID,
			moduleName: resolvedModule,
			multiple,
		})
	}

	public async emit(input: EventEmitInput): Promise<boolean> {
		const normalizedName = EventsDomain.normalizeEventName(input.eventName)
		if (!EventsDomain.isValidEventName(normalizedName)) {
			throw new Error(`Invalid event name "${normalizedName}". Expected format A.B.C`)
		}

		const entry = this.registeredEvents[normalizedName]
		if (!entry) {
			console.warn(`Event "${normalizedName}" is not registered`)
			return false
		}

		const fromModuleName = EventsDomain.getModuleFromEventName(normalizedName)
		if (!entry.emitters.includes(fromModuleName)) {
			console.warn(`Emitter module "${fromModuleName}" is not registered for "${normalizedName}"`)
			return false
		}

		const event: EventType = {
			eventName: normalizedName,
			payload: input.payload,
			fromModuleName,
			uuid: Bun.randomUUIDv7(),
			emittedAt: Date.now(),
		}

		const emitted = await this.emitInternal(entry, event)
		await this.emitGlobalDebug(event)
		return emitted
	}

	public getAllRegisteredEventsIntoCluster(): Record<string, TypeEvent> {
		const output: Record<string, TypeEvent> = {}
		for (const [eventName, entry] of Object.entries(this.registeredEvents)) {
			output[eventName] = this.cloneEvent(entry, this.clusterId)
		}
		return output
	}

	public getAllRegisteredEvents(): Record<string, TypeEvent> {
		const output: Record<string, TypeEvent> = {}
		for (const [eventName, entry] of Object.entries(this.registeredEvents)) {
			output[eventName] = this.cloneEvent(entry)
		}
		return output
	}

	public registerEmitter(eventName: string, moduleName?: string): void {
		const normalizedName = EventsDomain.normalizeEventName(eventName, moduleName)
		if (!EventsDomain.isValidEventName(normalizedName)) {
			throw new Error(`Invalid event name "${normalizedName}". Expected format A.B.C`)
		}

		const resolvedModule = EventsDomain.normalizeModuleName(
			moduleName ?? EventsDomain.getModuleFromEventName(normalizedName),
		)
		this.registerEmitterInternal(normalizedName, resolvedModule)
		this.localEmitterRegistry.set(normalizedName, resolvedModule)
		this.sendCommand({
			type: 'registerEmitter',
			eventName: normalizedName,
			moduleName: resolvedModule,
		})
	}

	public listenEvent<TypePayload>(
		eventName: string,
		callback: (payload: TypePayload) => void,
	): void {
		this.listen(
			{ eventName },
			(event) => callback(event.payload as TypePayload),
		)
	}

	public async emitEvent(eventName: string, payload: object): Promise<boolean> {
		return this.emit({ eventName, payload })
	}

	public close(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
		}
		this.sendCommand({
			type: 'removeInstance',
			clusterId: this.clusterId,
			instanceId: this.processUUID,
		})
		this.adapter.close?.()
	}

	private subscribeControlChannel(): void {
		if (this.subscribedChannels.has(CONTROL_CHANNEL)) {
			return
		}
		this.subscribedChannels.add(CONTROL_CHANNEL)
		this.adapter.subscribe(CONTROL_CHANNEL, (payload: TypeEventCommand) => {
			if (!payload) {
				return
			}
			this.handleCommand(payload)
		})
	}

	private resubscribeAll(): void {
		this.subscribedChannels.clear()
		this.subscribeControlChannel()
		for (const eventName of this.localHandlers.keys()) {
			this.subscribeInstanceChannel(eventName)
		}
	}

	private handleCommand(command: TypeEventCommand): void {
		switch (command.type) {
			case 'registerListener':
				if (command.instanceId === this.processUUID) {
					return
				}
				this.registerListenerInstance(
					command.eventName,
					command.clusterId,
					command.instanceId,
					command.moduleName,
					command.multiple ?? false,
				)
				break
			case 'registerEmitter':
				this.registerEmitterInternal(command.eventName, command.moduleName)
				break
			case 'removeInstance':
				if (command.instanceId === this.processUUID) {
					return
				}
				this.removeInstanceListeners(command.clusterId, command.instanceId)
				break
		}
	}

	private sendCommand(command: TypeEventCommand): void {
		this.adapter.publish(CONTROL_CHANNEL, command)
	}

	private startHeartbeat(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId)
		}
		this.intervalId = setInterval(() => {
			for (const [eventName, moduleMap] of this.localListenerRegistry.entries()) {
				for (const [moduleName, multiple] of moduleMap.entries()) {
					this.sendCommand({
						type: 'registerListener',
						eventName,
						clusterId: this.clusterId,
						instanceId: this.processUUID,
						moduleName,
						multiple,
					})
				}
			}
			for (const [eventName, moduleName] of this.localEmitterRegistry.entries()) {
				this.sendCommand({
					type: 'registerEmitter',
					eventName,
					moduleName,
				})
			}
		}, 5000)
	}

	private registerListenerLocal(
		eventName: string,
		moduleName: string,
		multiple: boolean,
		handler?: (event: EventType) => void | Promise<void>,
	): void {
		const normalizedModule = EventsDomain.normalizeModuleName(moduleName)
		this.registerListenerInstance(
			eventName,
			this.clusterId,
			this.processUUID,
			normalizedModule,
			multiple,
		)

		const moduleMap = this.localListenerRegistry.get(eventName) ?? new Map<string, boolean>()
		moduleMap.set(normalizedModule, multiple)
		this.localListenerRegistry.set(eventName, moduleMap)

		if (handler) {
			const handlers = this.localHandlers.get(eventName) ?? []
			if (!multiple && handlers.length > 0) {
				console.warn(`Event "${eventName}" is single-listen. Ignoring extra handler.`)
			} else {
				handlers.push({ handler, moduleName: normalizedModule })
				this.localHandlers.set(eventName, handlers)
				this.subscribeInstanceChannel(eventName)
			}
		}
	}

	private subscribeInstanceChannel(eventName: string): void {
		const channel = this.getInstanceChannel(eventName, this.clusterId, this.processUUID)
		if (this.subscribedChannels.has(channel)) {
			return
		}
		this.subscribedChannels.add(channel)
		this.adapter.subscribe(channel, async (payload: EventType) => {
			await this.handleIncomingEvent(payload)
		})
	}

	private async handleIncomingEvent(payload: EventType): Promise<void> {
		if (!payload?.eventName) {
			return
		}
		const handlers = this.localHandlers.get(payload.eventName) ?? []
		if (!handlers.length) {
			return
		}
		const eventEntry = this.registeredEvents[payload.eventName]
		const isMultiple = eventEntry?.multiple ?? false
		const handlersToRun = isMultiple ? handlers : handlers.slice(0, 1)

		for (const { handler } of handlersToRun) {
			try {
				await handler(payload)
			} catch (error) {
				console.error(`Error handling event "${payload.eventName}":`, error)
			}
		}
	}

	private registerListenerInstance(
		eventName: string,
		clusterId: string,
		instanceId: string,
		moduleName: string,
		multiple: boolean,
	): void {
		const normalizedModule = EventsDomain.normalizeModuleName(moduleName)
		const entry = this.ensureEvent(eventName, multiple)
		if (multiple && !entry.multiple) {
			entry.multiple = true
		}

		const cluster = entry.listeners[clusterId] ?? { instances: [], cursor: 0 }
		const existing = cluster.instances.find(instance => instance.instanceId === instanceId)
		if (existing) {
			existing.moduleName = normalizedModule
		} else {
			cluster.instances.push({ instanceId, moduleName: normalizedModule })
		}
		entry.listeners[clusterId] = cluster

		if (!entry.firstListener) {
			entry.firstListener = { clusterId, instanceId, moduleName: normalizedModule }
		}
	}

	private removeInstanceListeners(clusterId: string, instanceId: string): void {
		for (const entry of Object.values(this.registeredEvents)) {
			const cluster = entry.listeners[clusterId]
			if (!cluster) {
				continue
			}
			cluster.instances = cluster.instances.filter(instance => instance.instanceId !== instanceId)
			if (!cluster.instances.length) {
				delete entry.listeners[clusterId]
			}
			if (
				entry.firstListener &&
				entry.firstListener.clusterId === clusterId &&
				entry.firstListener.instanceId === instanceId
			) {
				entry.firstListener = this.findFirstListener(entry)
			}
		}
	}

	private registerEmitterInternal(eventName: string, moduleName: string): void {
		const normalizedModule = EventsDomain.normalizeModuleName(moduleName)
		const entry = this.ensureEvent(eventName)
		if (!entry.emitters.includes(normalizedModule)) {
			entry.emitters.push(normalizedModule)
		}
	}

	private ensureEvent(eventName: string, multiple: boolean = false): TypeEvent {
		const normalizedName = eventName
		if (!this.registeredEvents[normalizedName]) {
			this.registeredEvents[normalizedName] = {
				eventName: normalizedName,
				multiple,
				payload: {},
				fromModuleName: EventsDomain.getModuleFromEventName(normalizedName),
				emitters: [],
				listeners: {},
			}
		}
		const entry = this.registeredEvents[normalizedName]
		if (multiple && !entry.multiple) {
			entry.multiple = true
		}
		return entry
	}

	private getTargets(entry: TypeEvent): Array<{ clusterId: string; instanceId: string }> {
		if (entry.multiple) {
			const targets: Array<{ clusterId: string; instanceId: string }> = []
			for (const [clusterId, cluster] of Object.entries(entry.listeners)) {
				if (!cluster.instances.length) {
					continue
				}
				const index = cluster.cursor % cluster.instances.length
				const instance = cluster.instances[index]
				cluster.cursor = (index + 1) % cluster.instances.length
				targets.push({ clusterId, instanceId: instance.instanceId })
			}
			return targets
		}

		const first = entry.firstListener ?? this.findFirstListener(entry)
		if (!first) {
			return []
		}
		return [{ clusterId: first.clusterId, instanceId: first.instanceId }]
	}

	private async emitInternal(entry: TypeEvent, payload: EventType): Promise<boolean> {
		const targets = this.getTargets(entry)
		if (!targets.length) {
			return false
		}

		await Promise.all(
			targets.map(target =>
				Promise.resolve(
					this.adapter.publish(
						this.getInstanceChannel(payload.eventName, target.clusterId, target.instanceId),
						payload,
					),
				),
			),
		)

		return true
	}

	private async emitGlobalDebug(event: EventType): Promise<void> {
		const debugEntry = this.registeredEvents[GLOBAL_DEBUG_EVENT]
		if (!debugEntry) {
			return
		}

		const debugPayload: EventType = {
			eventName: GLOBAL_DEBUG_EVENT,
			payload: { event },
			fromModuleName: 'S42',
			uuid: Bun.randomUUIDv7(),
			emittedAt: Date.now(),
		}

		await this.emitInternal(debugEntry, debugPayload)
	}

	private findFirstListener(entry: TypeEvent): TypeEvent['firstListener'] {
		for (const [clusterId, cluster] of Object.entries(entry.listeners)) {
			const first = cluster.instances[0]
			if (first) {
				return { clusterId, instanceId: first.instanceId, moduleName: first.moduleName }
			}
		}
		return undefined
	}

	private cloneEvent(entry: TypeEvent, onlyClusterId?: string): TypeEvent {
		const listeners: Record<string, TypeEventClusterListeners> = {}
		const clusterIds = onlyClusterId ? [onlyClusterId] : Object.keys(entry.listeners)
		for (const clusterId of clusterIds) {
			const cluster = entry.listeners[clusterId]
			if (!cluster) {
				continue
			}
			listeners[clusterId] = {
				cursor: cluster.cursor,
				instances: cluster.instances.map(instance => ({
					instanceId: instance.instanceId,
					moduleName: instance.moduleName,
				})),
			}
		}

		return {
			eventName: entry.eventName,
			multiple: entry.multiple,
			payload: entry.payload ? { ...entry.payload } : {},
			fromModuleName: entry.fromModuleName,
			emitters: [...entry.emitters],
			listeners,
			firstListener: entry.firstListener ? { ...entry.firstListener } : undefined,
		}
	}

	private getInstanceChannel(eventName: string, clusterId: string, instanceId: string): string {
		return `${eventName}::${clusterId}::${instanceId}`
	}

	private static normalizeEventName(eventName: string, moduleName?: string): string {
		if (eventName === GLOBAL_DEBUG_EVENT || eventName.startsWith('$$')) {
			return eventName
		}
		const cleanedEvent = eventName.replace(/\$/g, '.').replace(/\s+/g, '')
		const cleanedModule = moduleName ? moduleName.replace(/\$/g, '.').replace(/\s+/g, '') : ''
		const upperEvent = cleanedEvent.toUpperCase()
		if (!cleanedModule) {
			return upperEvent
		}
		const upperModule = cleanedModule.toUpperCase()
		if (upperEvent.startsWith(`${upperModule}.`)) {
			return upperEvent
		}
		return `${upperModule}.${upperEvent}`
	}

	private static isValidEventName(eventName: string): boolean {
		if (eventName === GLOBAL_DEBUG_EVENT || eventName.startsWith('$$')) {
			return true
		}
		const parts = eventName.split('.').filter(Boolean)
		if (parts.length < 3) {
			return false
		}
		return parts.every(part => /^[A-Z0-9_-]+$/.test(part))
	}

	private static getModuleFromEventName(eventName: string): string {
		if (eventName === GLOBAL_DEBUG_EVENT || eventName.startsWith('$$')) {
			return 'S42'
		}
		return eventName.split('.')[0] ?? 'UNKNOWN'
	}

	private static normalizeModuleName(moduleName: string): string {
		return moduleName.replace(/\$/g, '.').replace(/\s+/g, '').toUpperCase()
	}

	private static resolveClusterId(clusterId?: string): string {
		return (
			clusterId ??
			Bun.env.S42_CLUSTER_ID ??
			Bun.env.CLUSTER_NAME ??
			'default'
		).toUpperCase()
	}

	/**
	 * Returns a singleton instance of EventsDomain.
	 */
	public static getInstance(
		redisInstance?: RedisClient,
		uuid?: string,
		clusterId?: string,
	): EventsDomain {
		if (!EventsDomain.instance) {
			EventsDomain.instance = new EventsDomain(redisInstance, uuid, clusterId)
		}
		return EventsDomain.instance
	}
}
