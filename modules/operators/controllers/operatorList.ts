import type { ControllerType } from '@/Modules'

export default {
	name: 'operatorList',
	version: '1.0.0',
	method: 'GET',
	path: '/operators/list',
	enabled: true,
	handler: async (req: any, res: any) => {
		return res.json({
			ok: true,
			docs: [{ id: 1, name: 'John Doe' }],
		})
	},
	handleError: async (req: any, res: any, err: any) => {
		console.error('Error in operatorList:', err)
		return res.json({
			ok: false,
			msg: 'Error',
		})
	},
	// requireBefore: ['mws'],
} as ControllerType
