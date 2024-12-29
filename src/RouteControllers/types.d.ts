export type TypeReturnCallback = (req: Request) => Response | Promise<Response>

export type RouteCheckResult = {
	exists: boolean
	params: { [key: string]: string }
	key: string
}

type TypeRoutesMapCache = {
	[key: string]: (req: any, next?: (req: any, res: any) => void) => void
}

type TypeRequestInternalObject = {
	headers: object
	realIp: string
	url: string
	method: string
	query: { [string]: [string] }
	body: { [string]: [string] }
}

type TypeResponseInternalObject = {
	end: (body: string) => void
	json: (body: object) => void
	_404: (body: string) => void
	_500: (body: string) => void
}
