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

export async function sendEmail(params: MailgunParams): Promise<MailgunResponse> {
	try {
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
		const response = await fetch(
			`${apiHost}/v3/${domainName}/messages`,
			{
				method: 'POST',
				headers: {
					Authorization: `Basic ${credentials}`,
				},
				body: form,
			}
		);

		const data = await response.text();
		return data as unknown as MailgunResponse;
	} catch (err) {
		throw err
	}

}