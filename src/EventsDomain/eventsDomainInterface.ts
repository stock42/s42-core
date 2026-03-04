import type {
	EventEmitInput,
	EventListenInput,
	EventType,
	EventsAdapter,
	TypeEvent,
} from './types.d.js'

export interface EventsDomainsInterface {
	listen: (
		input: EventListenInput,
		handler?: (event: EventType) => void | Promise<void>,
		moduleName?: string,
	) => void
	emit: (input: EventEmitInput) => Promise<boolean>
	getAllRegisteredEventsIntoCluster: () => Record<string, TypeEvent>
	getAllRegisteredEvents: () => Record<string, TypeEvent>
	setAdapter: (adapterHandle: EventsAdapter) => void
	registerEmitter: (eventName: string, moduleName?: string) => void

	// Backwards compatibility
	listenEvent: (eventName: string, callback: (payload: any) => void) => void
	emitEvent: (eventName: string, payload: object) => Promise<boolean>
}
