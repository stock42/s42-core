# MAILGUN

## Purpose

`sendEmail` is a thin helper for sending Mailgun emails from S42-Core services.

## API

```ts
await sendEmail({
  domainName,
  username,
  password,
  from,
  to,
  subject,
  text,
  html,
  apiHost,
})
```

### `MailgunParams`

- `domainName: string`
- `username: string`
- `password: string`
- `from: string`
- `to: string`
- `subject: string`
- `text?: string`
- `html?: string`
- `apiHost?: string` (default: `api.eu.mailgun.net`)

## Example

```ts
import { sendEmail } from 's42-core/dist/Mailgun'

await sendEmail({
  domainName: 'sandbox.example.mailgun.org',
  username: 'api',
  password: process.env.MAILGUN_KEY!,
  from: 'noreply@example.com',
  to: 'ops@example.com',
  subject: 'S42-Core alert',
  text: 'Service up',
})
```

## Operational recommendations

- Store credentials in environment variables.
- Validate API host and use HTTPS endpoint.
- Handle non-2xx responses explicitly in calling services.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
