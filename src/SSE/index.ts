
export type TypeSSEventToSend = {
	eventName: string
	eventPayload: Record<string, any>
}

export class SSE {
	private response: Response
	private readonly uuid: string
	private localID: number = 0
	private controller: ReadableStreamDirectController | null = null;

	constructor(req: Request) {
		this.uuid = crypto.randomUUID()

		const signal = req.signal;
		const _this = this;
		this.response = new Response(
			new ReadableStream({
				type: "direct",
				// The stream stays open until the client disconnects (request signal
				// aborts). We flush once per second so buffered events are pushed
				// promptly; this interval also acts as the keep-alive heartbeat.
				async pull(controller: ReadableStreamDirectController) {
					_this.controller = controller
					while (!signal?.aborted) {
						await controller.flush();
						await Bun.sleep(1000);
					}
					controller.close();
				},
			}),
			{ status: 200, headers: { "Content-Type": "text/event-stream" } },
		);

	}

	public getResponse(): Response {
		return this.response;
	}

	private sendSSEMessage(data: string) {
		return this?.controller?.write(data);
	}

	public getUUID(): string {
		return this.uuid
	}

	public send(data: TypeSSEventToSend): void {
		const formattedData = this.formatEvent(data)
		try {
			this.sendSSEMessage(formattedData)
		} catch (error) {
			console.error('Error sending SSE data:', error)
		}
	}

	public close(): void {
		try {
			this.controller?.close()
		} catch (error) {
			console.error('Error closing SSE connection:', error)
		}
	}

	private formatEvent(data: TypeSSEventToSend): string {
		return `id: ${this.localID++}\nevent: ${data.eventName}\ndata: ${JSON.stringify(
			data.eventPayload,
		)}\n\n`
	}

}
