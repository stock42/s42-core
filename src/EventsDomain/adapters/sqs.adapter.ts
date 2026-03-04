import type { EventsAdapter } from '../types.d.js'
import {
	DeleteMessageCommand,
	ReceiveMessageCommand,
	SendMessageCommand,
	SQSClient,
	type Message,
} from '@aws-sdk/client-sqs'

export type SQSEventsAdapterOptions = {
	queueUrl: string
	region?: string
	client?: SQSClient
	pollIntervalMs?: number
	waitTimeSeconds?: number
	visibilityTimeoutSeconds?: number
	maxMessages?: number
	messageGroupId?: string
	messageDeduplicationId?: (payload: object) => string
}

export class SQSEventsAdapter implements EventsAdapter {
	public readonly name = 'sqs'
	private readonly client: SQSClient
	private readonly queueUrl: string
	private readonly pollIntervalMs: number
	private readonly waitTimeSeconds: number
	private readonly visibilityTimeoutSeconds?: number
	private readonly maxMessages: number
	private readonly messageGroupId?: string
	private readonly messageDeduplicationId?: (payload: object) => string

	private running = false
	private stopRequested = false
	private readonly handlers = new Map<string, Array<(payload: any, channel: string) => void>>()

	constructor(options: SQSEventsAdapterOptions) {
		this.queueUrl = options.queueUrl
		this.client = options.client ?? new SQSClient({ region: options.region })
		this.pollIntervalMs = options.pollIntervalMs ?? 500
		this.waitTimeSeconds = options.waitTimeSeconds ?? 10
		this.visibilityTimeoutSeconds = options.visibilityTimeoutSeconds
		this.maxMessages = options.maxMessages ?? 10
		this.messageGroupId = options.messageGroupId
		this.messageDeduplicationId = options.messageDeduplicationId
	}

	public async publish(channel: string, payload: object): Promise<void> {
		const body = JSON.stringify({ channel, payload })
		const command = new SendMessageCommand({
			QueueUrl: this.queueUrl,
			MessageBody: body,
			MessageAttributes: {
				channel: {
					DataType: 'String',
					StringValue: channel,
				},
			},
			MessageGroupId: this.messageGroupId,
			MessageDeduplicationId: this.messageDeduplicationId?.(payload),
		})

		await this.client.send(command)
	}

	public subscribe(channel: string, handler: (payload: any, channel: string) => void): void {
		const list = this.handlers.get(channel) ?? []
		list.push(handler)
		this.handlers.set(channel, list)

		if (!this.running) {
			void this.startPolling()
		}
	}

	public unsubscribe(channel: string): void {
		this.handlers.delete(channel)
	}

	public async close(): Promise<void> {
		this.stopRequested = true
	}

	private async startPolling(): Promise<void> {
		this.running = true
		while (!this.stopRequested) {
			try {
				const response = await this.client.send(
					new ReceiveMessageCommand({
						QueueUrl: this.queueUrl,
						MaxNumberOfMessages: this.maxMessages,
						WaitTimeSeconds: this.waitTimeSeconds,
						VisibilityTimeout: this.visibilityTimeoutSeconds,
						MessageAttributeNames: ['All'],
					}),
				)

				const messages = response.Messages ?? []
				if (!messages.length) {
					await Bun.sleep(this.pollIntervalMs)
					continue
				}

				for (const message of messages) {
					await this.handleMessage(message)
				}
			} catch (error) {
				console.error('SQS adapter poll error:', error)
				await Bun.sleep(this.pollIntervalMs)
			}
		}
		this.running = false
	}

	private async handleMessage(message: Message): Promise<void> {
		const channel = message.MessageAttributes?.channel?.StringValue
		const parsed = this.parseMessageBody(message.Body)
		const resolvedChannel = channel ?? parsed?.channel
		const payload = parsed?.payload ?? parsed

		if (resolvedChannel) {
			const handlers = this.handlers.get(resolvedChannel) ?? []
			for (const handler of handlers) {
				try {
					handler(payload, resolvedChannel)
				} catch (error) {
					console.error('SQS adapter handler error:', error)
				}
			}
		}

		if (message.ReceiptHandle) {
			await this.client.send(
				new DeleteMessageCommand({
					QueueUrl: this.queueUrl,
					ReceiptHandle: message.ReceiptHandle,
				}),
			)
		}
	}

	private parseMessageBody(body?: string | null): any {
		if (!body) {
			return null
		}
		try {
			return JSON.parse(body)
		} catch {
			return { payload: body }
		}
	}
}
