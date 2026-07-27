# SSE

## Purpose

`SSE` creates a `text/event-stream` response backed by Bun's direct readable
stream controller.

It requires the raw Web `Request` so it can observe `request.signal`.

## Constructor and API

```ts
const stream = new SSE(request)
```

- `getResponse(): Response`
- `getUUID(): string`
- `send({ eventName, eventPayload }): void`
- `close(): void`

Event format:

```text
id: 0
event: tick
data: {"now":123}

```

IDs increment per `SSE` instance.

## Raw Bun route example

```ts
import { SSE } from 's42-core'

Bun.serve({
	port: 3000,
	routes: {
		'/stream': (request: Request) => {
			const stream = new SSE(request)
			const timer = setInterval(() => {
				stream.send({
					eventName: 'tick',
					eventPayload: { now: Date.now() },
				})
			}, 1_000)

			request.signal.addEventListener('abort', () => {
				clearInterval(timer)
				stream.close()
			})

			return stream.getResponse()
		},
	},
})
```

## RouteControllers integration constraint

Normal S42-Core controller handlers receive the normalized
`RouteControllers` request object, not the raw `Request`. That object does not
currently include `signal`.

Therefore the previous pattern `new SSE(req)` inside a normal `Controller`
cannot observe client disconnects correctly. Use `SSE` only from a route surface
that preserves the raw Web request until that routing contract is extended.

## Runtime notes

- The response currently sets only `Content-Type: text/event-stream`.
- The direct stream flushes every second until the request aborts.
- `send()` before Bun has supplied the direct stream controller can be dropped.
- Always stop timers and release resources on abort.
- `close()` catches and logs close errors, including repeated closure.
