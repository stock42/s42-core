export type ValidMethods =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'DELETE'
	| 'OPTIONS'
	| 'PATCH'
	| 'OPTIONS'
	| 'HEAD'
	| '*'

export type TypeHook = {
	method: ValidMethods
	path: string
	when: 'before' | 'after'
	handle: (
		req: Request,
		res: Response,
		next: (req: Request, res: Response) => void,
	) => void
}