import { Server, RouteControllers, Controller } from '../src/index'
import { S3Client } from 'bun'

const s3 = new S3Client()

const requiredEnv = [
	{ primary: 'S3_BUCKET', fallback: 'AWS_BUCKET' },
	{ primary: 'S3_REGION', fallback: 'AWS_REGION' },
	{ primary: 'S3_ACCESS_KEY_ID', fallback: 'AWS_ACCESS_KEY_ID' },
	{ primary: 'S3_SECRET_ACCESS_KEY', fallback: 'AWS_SECRET_ACCESS_KEY' },
]

const getMissingS3Env = (): string[] =>
	requiredEnv
		.filter(({ primary, fallback }) => !process?.env?.[primary] && !process?.env?.[fallback])
		.map(({ primary }) => primary)

const uploadToS3 = new Controller('POST', '/s3/upload', async (req, res) => {
	const missing = getMissingS3Env()
	if (missing.length > 0) {
		return res.status(500).json({ error: `Missing S3 config: ${missing.join(', ')}` })
	}

	const formData = req.formData()
	const file = formData.get('file')
	if (!file || !(file instanceof Blob)) {
		return res.status(400).json({ error: 'Missing file field in form-data' })
	}

	const keyValue = formData.get('key')
	const key =
		typeof keyValue === 'string' && keyValue.length > 0
			? keyValue
			: file instanceof File && file.name
				? file.name
				: `upload-${Date.now()}`

	const s3File = s3.file(key)
	await s3File.write(file)

	return res.json({
		key,
		presignedUrl: s3File.presign({ expiresIn: 60 * 10 }),
	})
})

const getS3Metadata = new Controller('GET', '/s3/:key', async (req, res) => {
	const missing = getMissingS3Env()
	if (missing.length > 0) {
		return res.status(500).json({ error: `Missing S3 config: ${missing.join(', ')}` })
	}

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

(async function startServer() {
	const apiServer = new Server()
	await apiServer.start({
		port: parseInt(String(process?.env?.PORT ?? 5679), 10),
		development: true,
		RouteControllers: new RouteControllers([uploadToS3, getS3Metadata]),
	})
	console.info(`🚀 S3 example running on port ${process?.env?.PORT ?? 5679}`)
})()
