import { Server, RouteControllers, Controller } from '../src/index'
(async function startServer() {
	let x =0
	const hello = new Controller('GET', '/hello', async (req, res) => {
		console.info('Hello World!')
		return res.send(`Hello World! ${x++}`)
	})

  console.info("S42-Core Framework running...")
  const apiServer = new Server()
	await apiServer.start({
		port: parseInt(String(process?.env?.PORT ?? 5678), 10),
		clustering: true,
		idleTimeout: 30,
		maxRequestBodySize: Number.MAX_SAFE_INTEGER,
		development: true,
		awaitForCluster: true,
		hooks: [
			{
				method: '*',
				path: '*',
				when: 'before',
				handle: (req, res, next) => {
					console.info('Before all request')
					next(req, res)
				}
			},
			{
				method: '*',
				path: '*',
				when: 'after',
				handle: (req, res, next) => {
					console.info('Thanks for your visit')
					next(req, res)
				}
			}
		],
		RouteControllers: new RouteControllers([hello]),
	})
	console.info(`🚀 API Running on port ${process?.env?.PORT ?? 5678}`)
})()
