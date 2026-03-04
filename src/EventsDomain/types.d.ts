export type EventPayload = Record<string, any>

export type EventType<TPayload extends EventPayload = EventPayload> = {
	eventName: string
	payload: TPayload
	fromModuleName: string
	uuid: string
	emittedAt: number
}

export type EventListenInput = {
	eventName: string
	multiple?: boolean
}

export type EventEmitInput<TPayload extends EventPayload = EventPayload> = {
	eventName: string
	payload: TPayload
}

export type TypeEventInstance = {
	instanceId: string
	moduleName: string
}

export type TypeEventClusterListeners = {
	instances: TypeEventInstance[]
	cursor: number
}

export type TypeEvent = {
	eventName: string
	multiple: boolean
	payload?: EventPayload
	fromModuleName: string
	emitters: string[]
	listeners: Record<string, TypeEventClusterListeners>
	firstListener?: {
		clusterId: string
		instanceId: string
		moduleName: string
	}
}

export type TypeEventCommand =
	| {
			type: 'registerListener'
			eventName: string
			clusterId: string
			instanceId: string
			moduleName: string
			multiple?: boolean
	  }
	| {
			type: 'registerEmitter'
			eventName: string
			moduleName: string
	  }
	| {
			type: 'removeInstance'
			clusterId: string
			instanceId: string
	  }

export type EventsAdapter = {
	name: string
	publish: (channel: string, payload: object) => Promise<void> | void
	subscribe: (
		channel: string,
		handler: (payload: any, channel: string) => void,
	) => Promise<void> | void
	unsubscribe?: (channel: string) => Promise<void> | void
	close?: () => Promise<void> | void
}
