import { type Res } from '../Response'

export type TypeReturnCallback = (req: Request) => Response | Promise<Response> | void | Promise<void>

export type RouteCheckResult = {
	exists: boolean
	params: { [key: string]: string }
	key: string
}

export type TypeRoutesMapCache = {
	[key: string]: (req: any, res: Res) => void | Promise<void> | Response | Promise<Response>
}

export type TypeRequestInternalObject = {
	headers: Headers
	realIp: string
	url: string
	method: string
	query: Record<string, string>
	body: Record<string, any>
	formData: () => any
	params?: Record<string, string>
}

export type TypeResponseInternalObject = {
	end: (body: string) => void
	json: (body: object) => void
	_404: (body: string) => void
	_500: (body: string) => void
}
