export type TYPE_HTTP_METHOD =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'UPDATE'
	| 'PATCH'
	| 'OPTIONS'
	| '*'

export type Middleware = (req: any, res: any, next?: Middleware) => void
