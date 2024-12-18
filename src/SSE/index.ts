import { randomUUID } from 'crypto'
import { type IncomingMessage, type ServerResponse } from 'http'

export type TypeSSEventToSend = {
	eventName: string
	eventPayload: Record<string, any>
}

export class SSE {
	private response: ServerResponse
	private readonly uuid: string
	private localID: number = 0

	constructor(req: IncomingMessage, res: ServerResponse) {
		this.response = res
		this.uuid = randomUUID()
		this.setupConnection()
		this.sendWelcomeEvent()
	}

	/**
	 * Returns the unique identifier for the SSE connection.
	 */
	getUUID(): string {
		return this.uuid
	}

	/**
	 * Sends a server-sent event.
	 * @param data - The event data to send.
	 */
	send(data: TypeSSEventToSend): void {
		const formattedData = this.formatEvent(data)
		try {
			this.response.write(formattedData)
		} catch (error) {
			console.error('Error sending SSE data:', error)
		}
	}

	/**
	 * Closes the SSE connection.
	 */
	close(): void {
		try {
			this.response.end()
		} catch (error) {
			console.error('Error closing SSE connection:', error)
		}
	}

	/**
	 * Formats the event data according to the SSE protocol.
	 * @param data - The event data to format.
	 * @returns The formatted string.
	 */
	private formatEvent(data: TypeSSEventToSend): string {
		return `id: ${this.localID++}\nevent: ${data.eventName}\ndata: ${JSON.stringify(
			data.eventPayload,
		)}\n\n`
	}

	/**
	 * Sets up the SSE connection headers.
	 */
	private setupConnection(): void {
		this.response.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		})
		this.response.flushHeaders()
	}

	/**
	 * Sends a welcome event with the UUID.
	 */
	private sendWelcomeEvent(): void {
		this.send({
			eventName: 'welcome',
			eventPayload: {
				uuid: this.uuid,
			},
		})
	}
}
