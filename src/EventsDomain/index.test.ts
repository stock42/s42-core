import { afterAll, describe, expect, test } from 'bun:test'
import { EventsDomain } from './index'
import type { EventsAdapter } from './types.d'

// EventsDomain is a Redis-coupled singleton; swap in a no-op adapter so the test
// neither needs Redis nor performs any network I/O.
const noopAdapter: EventsAdapter = {
	name: 'noop',
	publish: () => {},
	subscribe: () => {},
	unsubscribe: () => {},
	close: () => {},
}

const domain = EventsDomain.getInstance()
domain.setAdapter(noopAdapter)

afterAll(() => {
	domain.close()
})

// TTL is 3 heartbeats (15s); jump well past it to force eviction deterministically.
const FAR_FUTURE_OFFSET = 60_000

describe('EventsDomain — dead instance eviction', () => {
	test('evicts a remote instance that stopped sending heartbeats', () => {
		const eventName = 'TEST.DEAD.INSTANCE'
		// Simulate a remote instance registering as a listener (as if via the control channel).
		;(domain as any).registerListenerInstance(
			eventName,
			'REMOTE',
			'dead-1',
			'TEST',
			false,
		)

		const before = domain.getAllRegisteredEvents()[eventName]
		expect(before.listeners['REMOTE'].instances.length).toBe(1)
		;(domain as any).evictStaleInstances(Date.now() + FAR_FUTURE_OFFSET)

		const after = domain.getAllRegisteredEvents()[eventName]
		expect(after?.listeners['REMOTE']).toBeUndefined()
	})

	test('re-points firstListener after the original is evicted', () => {
		const eventName = 'TEST.FIRST.LISTENER'
		;(domain as any).registerListenerInstance(eventName, 'REMOTE', 'dead-2', 'TEST', true)
		;(domain as any).registerListenerInstance(eventName, 'REMOTE', 'dead-3', 'TEST', true)

		const before = domain.getAllRegisteredEvents()[eventName]
		expect(before.firstListener?.instanceId).toBe('dead-2')

		// Keep dead-3 fresh, let dead-2 expire by registering dead-3 again "now".
		;(domain as any).registerListenerInstance(eventName, 'REMOTE', 'dead-3', 'TEST', true)
		const entry = (domain as any).registeredEvents[eventName]
		const deadTwo = entry.listeners['REMOTE'].instances.find(
			(i: any) => i.instanceId === 'dead-2',
		)
		deadTwo.lastSeen = Date.now() - FAR_FUTURE_OFFSET
		;(domain as any).evictStaleInstances(Date.now())

		const after = domain.getAllRegisteredEvents()[eventName]
		const ids = after.listeners['REMOTE'].instances.map((i: any) => i.instanceId)
		expect(ids).toEqual(['dead-3'])
		expect(after.firstListener?.instanceId).toBe('dead-3')
	})

	test('never evicts the local instance', () => {
		const eventName = 'TEST.LOCAL.ALIVE'
		domain.listen({ eventName }, () => {})
		;(domain as any).evictStaleInstances(Date.now() + FAR_FUTURE_OFFSET * 10)

		const clusterId = (domain as any).clusterId as string
		const after = domain.getAllRegisteredEvents()[eventName]
		expect(after.listeners[clusterId]?.instances.length).toBe(1)
	})
})
