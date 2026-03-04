import { Server, RouteControllers, Modules } from '../src'

export async function server() {
	console.info('Modules server testing v1.0')

	const apiServer = new Server()

	const modules = new Modules('./modules/')
	await modules.load()
	const modulesHooks = modules.getHooks()

	apiServer.start({
		port: Number.parseInt(String(process?.env?.SERVER_PORT ?? 5678), 10),
		clustering: false,
		idleTimeout: 30,
		maxRequestBodySize: Number.MAX_SAFE_INTEGER,
		development: true,
		awaitForCluster: false,
		hooks: [
			...modulesHooks,
			{
				method: '*',
				path: '*',
				when: 'before',
				handle: async (req, res, next) => {
					console.info(
						`Request: ${req.url} - ${
							req.headers.get('authorization')?.startsWith('Bearer ') ? '[AUTH]' : ''
						}`,
					)

					next(req, res)
				},
			},
			{
				method: '*',
				path: '*',
				when: 'after',
				handle: (req, res, next) => {
					next(req, res)
				},
			},
		],
		RouteControllers: new RouteControllers([...modules.getControllers()]),
	})

	console.info(
		`Modules server testing Running on port ${process?.env?.SERVER_PORT ?? 5678}`,
	)
}

if (import.meta.main) {
	await server()
}
