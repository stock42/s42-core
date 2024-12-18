import { type Middleware } from './types.d.js'

export interface ControllerInterface {
	get: () => void
	post: () => void
	put: () => void
	update: () => void
	patch: () => void
	options: () => void
	use: (callback: (req: any, next?: Middleware) => Response) => this
	setPath: (path: string) => void
}
