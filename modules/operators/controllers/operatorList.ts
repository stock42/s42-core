import type { ControllerType } from '../../../src/Modules'

export default {
	name: 'operatorList',
	version: '1.0.0',
	method: 'GET',
	path: '/operators/list',
	enabled: true,
	handler: async (req: any, res: any) => {
		return res.json({
			ok: true,
			docs: [as()],
		});
	},
	handleError: async (req: any, res: any, err: any) => {
		return res.json({
			ok: false,
			msg: 'Error',
		});
	}

} as ControllerType
