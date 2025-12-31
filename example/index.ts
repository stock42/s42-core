import { Server, RouteControllers, Controller } from '../src/index'
(async function startServer() {
	let x =0
	const hello = new Controller('GET', '/hello', async (req, res) => {
		try {
			console.info('Hello World!')
			return res.send(`Hello World! ${x++}`)
		} catch (err) {
			console.error(err)
			return res.send('Error')
		}
	})


	const form = new Controller('POST', '/form', async (req, res) => {
		try {
			console.info('Hello Form!: ', req)
			const formData = req.formData()
			const formEntries = Object.fromEntries(formData.entries())
			console.info('formData: ', formEntries)
			return res.json({
				message: `Hello Form! ${x++}`,
				formData: formEntries
			})
		} catch (err) {
			console.error(err)
			return res.send('Error')
		}
	})


  console.info("S42-Core Framework running...")
  const apiServer = new Server()
	apiServer.start({
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
		RouteControllers: new RouteControllers([hello, form]),
	})
	console.info(`🚀 API Running on port ${process?.env?.PORT ?? 5678}`)
})()
