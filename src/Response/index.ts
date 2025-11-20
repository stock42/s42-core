

type TypeResponseConstructor = {
	headers?: Record<string, string>
}

export class Res {
	private headers: Record<string, string> = {}
	private httpStatus: number = 200

	constructor({
		headers,
	}: TypeResponseConstructor) {
		this.headers = headers ?? {}
	}

	public status(status: number): this {
		this.httpStatus = status
		return this
	}

	public setHeader(key: string, value: string): void {
		this.headers[key] = value
	}

	public json(data: object): Response	{
		this.setHeader('Content-Type', 'application/json')
		return new Response(JSON.stringify(data), {
			status: this.httpStatus,
			headers: { ...this.headers },
		})
	}

	public send(data: string): Response {
		return new Response(data, {
			status: this.httpStatus,
			headers: { ...this.headers },
		})
	}

	public html(data: string): Response {
		this.setHeader('Content-Type', 'text/html')
		return new Response(data, {
			status: this.httpStatus,
			headers: { ...this.headers },
		})
	}

	public text(data: string): Response {
		this.setHeader('Content-Type', 'text/plain')
		return new Response(data, {
			status: this.httpStatus,
			headers: { ...this.headers },
		})
	}

	public redirect(url: string): Response {
		this.setHeader('Location', url)
		this.httpStatus = 302
		return new Response(null, {
			status: this.httpStatus,
			headers: { ...this.headers },
		})
	}
}