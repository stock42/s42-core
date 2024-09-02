import { randomUUID } from 'crypto'
import { type IncomingMessage, type ServerResponse } from 'http'

export type TypeSSEventToSend = {
	eventName: string
	eventPayload: { [key: string]: string }
}

export class SSE {
	private Response: ServerResponse
	private readonly uuid: string
	private localID: number
	constructor(req: IncomingMessage, res: ServerResponse) {
		this.Response = res
		this.localID = 0
		this.uuid = randomUUID()
		this.controllerPath()
		this.sendHello()
	}

	getUUID() {
		return this.uuid
	}

	private sendHello() {
		this.send({
			eventName: 'welcome',
			eventPayload: {
				uuid: this.uuid,
			},
		})
	}

	private controllerPath() {
		this.Response.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		})
		this.Response.flushHeaders()
	}

	send(data: TypeSSEventToSend) {
		const formattedData = `id: ${this.localID++}\nevent: ${data.eventName}\ndata: ${JSON.stringify(data.eventPayload)}\n\n`
		try {
			this.Response.write(formattedData)
		} catch (error) {
			console.error('Error sending SSE data:', error)
		}
	}

	close() {
		try {
			this.Response.end()
		} catch (error) {
			console.error('Error closing SSE connection:', error)
		}
	}
}
