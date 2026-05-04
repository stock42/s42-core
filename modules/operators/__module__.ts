export default {
	name: 'operators',
	version: '1.0.0',
	dependencies: [
		{
			module: 'auth',
			version: 1,
		},
	],
	initialize: () => {
		console.info('hola mundo, soy operators')
	},
}
