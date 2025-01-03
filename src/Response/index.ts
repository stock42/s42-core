

type TypeResponseConstructor = {
	headers?: Record<string, string>
}

export class Res {
	private headers: Record<string, string> = {}
	private status: number = 200

	constructor({
		headers,
	}: TypeResponseConstructor) {
		this.headers = headers ?? {}
	}

	public setStatus(status: number): void {
		this.status = status
	}

	public setHeader(key: string, value: string): void {
		this.headers[key] = value
	}

	public json(data: object): Response	{
		this.setHeader('Content-Type', 'application/json')
		return new Response(JSON.stringify(data), {
			headers: { ...this.headers },
		})
	}

	public text(data: string): Response {
		this.setHeader('Content-Type', 'text/plain')
		return new Response(data, {
			headers: { ...this.headers },
		})
	}

	public redirect(url: string): Response {
		this.setHeader('Location', url)
		this.status = 302
		return new Response(null, {
			status: this.status,
			headers: { ...this.headers },
		})
	}
}