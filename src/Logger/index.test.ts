import { afterEach, describe, expect, test } from 'bun:test'
import { getLogLevel, logger, setLogLevel, setLogSink, type LogSink } from './index'

const originalLevel = getLogLevel()

const consoleSink: LogSink = {
	debug: (...args) => console.log(...args),
	info: (...args) => console.info(...args),
	warn: (...args) => console.warn(...args),
	error: (...args) => console.error(...args),
}

afterEach(() => {
	setLogLevel(originalLevel)
	setLogSink(consoleSink)
})

function captureSink() {
	const calls = { debug: 0, info: 0, warn: 0, error: 0 }
	setLogSink({
		debug: () => (calls.debug += 1),
		info: () => (calls.info += 1),
		warn: () => (calls.warn += 1),
		error: () => (calls.error += 1),
	})
	return calls
}

describe('logger level gating', () => {
	test('default level is debug (everything on)', () => {
		expect(originalLevel).toBe('debug')
	})

	test('debug level emits every level', () => {
		const calls = captureSink()
		setLogLevel('debug')
		logger.debug('a')
		logger.info('b')
		logger.warn('c')
		logger.error('d')
		expect(calls).toEqual({ debug: 1, info: 1, warn: 1, error: 1 })
	})

	test('warn level suppresses debug and info', () => {
		const calls = captureSink()
		setLogLevel('warn')
		logger.debug('a')
		logger.info('b')
		logger.warn('c')
		logger.error('d')
		expect(calls).toEqual({ debug: 0, info: 0, warn: 1, error: 1 })
	})

	test('silent suppresses everything', () => {
		const calls = captureSink()
		setLogLevel('silent')
		logger.debug('a')
		logger.error('d')
		expect(calls).toEqual({ debug: 0, info: 0, warn: 0, error: 0 })
	})
})
