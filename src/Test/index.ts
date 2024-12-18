import pc from 'picocolors'

export function Init(message: string): void {
	console.info('\n', pc.bgYellow(pc.white(`> ${message}`)))
}

export function Ok(message: string): void {
	console.info('\n✅', pc.bgGreen(pc.white(`> ${message}`)))
}

export function Error(message: string, error?: Error): void {
	console.info(
		'\n📛',
		pc.bgRed(pc.white(`> ${message}`)),
		error ? `\n${error.stack}` : '',
	)
}

export function Request(method: string, url: string): void {
	console.info(pc.bgMagenta(pc.white(`+ Request > ${method.toUpperCase()} ${url}`)))
}

export function Finish(): void {
	console.info('\n😃', pc.bgWhite(pc.red('All tests completed')))
}
