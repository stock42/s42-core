import process from 'node:process'

type ShutDownCallbacks = Array<() => void>

export function Shutdown(callback: ShutDownCallbacks): void {
	process.on('exit', async () => {
		try {
			console.info('Shutdown process init...')
			for (let x = 0; x < callback.length; x += 1) {
				console.info('closing...')
				callback[x]()
			}
			process.exit(0)
		} catch (error) {
			console.error('Error closing connections:', error)
			process.exit(1)
		}
	})
}
