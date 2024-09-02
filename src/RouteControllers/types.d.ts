export type TypeReturnCallback = (req: IncomingMessage, res: ServerResponse) => void

export type RouteCheckResult = {
	exists: boolean
	params: { [key: string]: string }
	key: string
}

type TypeRoutesMapCache = {
	[key: string]: (req: any, res: any, next?: (req: any, res: any) => void) => void
}

type TypeRequestInternalObject = {
	headers: object
	realIp: string
	url: string
	method: string
	query: { [string]: [string] }
	body: { [string]: [string] }
	on: (evt: string, cb: () => void) => void
}

type TypeResponseInternalObject = {
	end: (body: string) => void
	json: (body: object) => void
	_404: (body: string) => void
	_500: (body: string) => void
}
