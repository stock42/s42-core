import { describe, expect, test } from 'bun:test'
import { Controller } from '../Controller'
import { RouteControllers } from './index'

function makeRouter(): RouteControllers {
	const controller = new Controller('GET', '/noop', (_req, res) => res.json({}))
	return new RouteControllers([controller])
}

// getQueryParams is private; we drive it directly to assert parsing behavior.
function parse(search: string): Record<string, string> {
	return (makeRouter() as any).getQueryParams(search)
}

describe('RouteControllers.getQueryParams', () => {
	test('parses simple pairs', () => {
		expect(parse('?a=1&b=2')).toEqual({ a: '1', b: '2' })
	})

	test('does NOT truncate values containing "=" (the bug fix)', () => {
		expect(parse('?token=ab=cd==')).toEqual({ token: 'ab=cd==' })
	})

	test('key without value yields empty string', () => {
		expect(parse('?flag')).toEqual({ flag: '' })
		expect(parse('?flag=')).toEqual({ flag: '' })
	})

	test('decodes percent-encoded values like before', () => {
		expect(parse('?q=hello%20world')).toEqual({ q: 'hello world' })
	})

	test('last value wins for repeated keys (unchanged)', () => {
		expect(parse('?a=1&a=2')).toEqual({ a: '2' })
	})

	test('empty query yields empty object', () => {
		expect(parse('')).toEqual({})
		expect(parse('?')).toEqual({})
	})
})
