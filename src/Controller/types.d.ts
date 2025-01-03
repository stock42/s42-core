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

export type Middleware =  (req: Union<Request,  Record<string, string>>, res: Res) => Promise<Response> | Response | void | Promise<void>


