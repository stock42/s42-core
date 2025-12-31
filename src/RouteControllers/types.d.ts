import { type Res } from '../Response'

export type TypeReturnCallback = (req: Request, res: Res) => Response | Promise<Response> | void | Promise<void>

export type RouteCheckResult = {
	exists: boolean
	params: { [key: string]: string }
	key: string
}

type TypeRoutesMapCache = {
	[key: string]: (req: any, res: Res) => void | Promise<void> | Response | Promise<Response>
}

type TypeRequestInternalObject = {
	headers: object
	realIp: string
	url: string
	method: string
	query: Record<string, string>
	body: Record<string, string>
	formData: () => FormData
	params?: Record<string, string>
}

type TypeResponseInternalObject = {
	end: (body: string) => void
	json: (body: object) => void
	_404: (body: string) => void
	_500: (body: string) => void
}
