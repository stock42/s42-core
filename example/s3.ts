import { Server, RouteControllers, Controller } from '../src/index'
import { S3Client } from 'bun'

const s3 = new S3Client()


const uploadToS3 = new Controller('POST', '/s3/upload', async (req, res) => {
	console.info('/s3/upload called')
	const formData = req.formData()
	const file = formData.get('file')
	if (!file || !(file instanceof Blob)) {
		return res.status(400).json({ error: 'Missing file field in form-data' })
	}

	const key = `${Bun.randomUUIDv7()}-${Date.now()}`

	const s3File = s3.file(key)
	await s3File.write(file)

	return res.json({
		key,
		presignedUrl: s3File.presign({ expiresIn: 60 * 10 }),
	})
})

const getS3Metadata = new Controller('GET', '/s3/:key', async (req, res) => {


	const key = req.params?.key
	if (!key) {
		return res.status(400).json({ error: 'Missing key param' })
	}


	const s3File = s3.file(key)
	const exists = await s3File.exists()
	if (!exists) {
		return res.status(404).json({ error: 'S3 object not found', key })
	}


	const stat = await s3File.stat()
	return res.json({
		key,
		size: stat.size,
		etag: stat.etag,
		lastModified: stat.lastModified,
		type: stat.type,
	})

})

async function startServer() {
	const apiServer = new Server()
	apiServer.start({
		port: Number.parseInt(String(process?.env?.PORT ?? 5679), 10),
		development: true,
		idleTimeout: 255,
		RouteControllers: new RouteControllers([uploadToS3, getS3Metadata]),
		maxRequestBodySize: 1024 * 1024 * 5,
	})
	console.info(`🚀 S3 example running on port ${process?.env?.PORT ?? 5679}`)
}

startServer()
