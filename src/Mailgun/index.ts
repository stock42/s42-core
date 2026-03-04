export interface MailgunParams {
  domainName: string;  // Domain configured in your Mailgun account (e.g., "sandboxXXXXXX.mailgun.org")
  username: string;    // Usually "api" in Mailgun
  password: string;    // Your Mailgun API key
  from: string;        // The sender (e.g., "test@yourdomain.com")
  to: string;          // Recipient or recipients (e.g., "recipient@example.com")
  subject: string;     // Subject of the email
  text?: string;        // Text body of the message (optional)
	html?: string;      // HTML body of the message (optional)
	apiHost?: string;   // Mailgun API host (e.g., "api.eu.mailgun.net", optional)
}

export type MailgunResponse = {
  id: string;
  message: string;
};

function normalizeApiHost(host: string): string {
	const trimmed = host.trim()
	if (!trimmed) {
		throw new Error('Mailgun apiHost is required')
	}

	if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
		return trimmed
	}

	return `https://${trimmed}`
}

export async function sendEmail(params: MailgunParams): Promise<MailgunResponse> {
	const { domainName, username, password, from, to, subject, text, html, apiHost = 'api.eu.mailgun.net' } = params;
	const form = new FormData();
	form.append('from', from);
	form.append('to', to);
	form.append('subject', subject);
	if (text) {
		form.append('text', text);
	}

	if (html) {
		form.append('html', html);
	}

	const credentials = btoa(`${username}:${password}`);
	const host = normalizeApiHost(apiHost)
	const response = await fetch(
		`${host}/v3/${domainName}/messages`,
		{
			method: 'POST',
			headers: {
				Authorization: `Basic ${credentials}`,
			},
			body: form,
		}
	);

	const rawBody = await response.text();
	if (!response.ok) {
		throw new Error(`Mailgun request failed (${response.status}): ${rawBody}`)
	}

	try {
		return JSON.parse(rawBody) as MailgunResponse
	} catch {
		throw new Error(`Mailgun returned non-JSON response: ${rawBody}`)
	}
}
