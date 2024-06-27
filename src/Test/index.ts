import pc from 'picocolors'

export const Init = (str: string) => {
	console.info(' ')
	console.info(pc.bgYellow(pc.white(`> ${str}`)))
}

export const Ok = (str: string) => {
	console.info(' ')
	console.info('✅', pc.bgGreen(pc.white(`> ${str}`)))
}

export const Error = (str: string, err: Error) => {
	console.info(' ')
	console.info('📛', pc.bgRed(pc.white(`${str}`)), err)
}

export const Request = (method: string, url: string) => {
	console.info(pc.bgMagenta(pc.white(`+ Request > ${method} ${url}`)))
}

export const Finish = () => {
	console.info('😃', pc.bgWhite(pc.red('All tests completed')))
}
