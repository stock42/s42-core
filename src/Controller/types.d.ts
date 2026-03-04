import { type Res } from '../Response'

export type TYPE_HTTP_METHOD =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'UPDATE'
	| 'PATCH'
	| 'OPTIONS'
	| '*'

export type ControllerRequest = Request | Record<string, unknown>

export type MiddlewareReturn = Response | void | unknown | Promise<Response | void | unknown>

export type Middleware =  (
	req: ControllerRequest,
	res: Res,
) => MiddlewareReturn
