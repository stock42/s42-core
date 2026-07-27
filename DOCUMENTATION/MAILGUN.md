# MAILGUN (INTERNAL)

## Public API status

`src/Mailgun` contains a `sendEmail()` helper, but it is not exported by
`src/index.ts` or the package export map.

Package consumers cannot use `s42-core/dist/Mailgun` or another deep import.
This page is repository-maintainer reference only.

## Internal API

```ts
sendEmail({
  domainName,
  username,
  password,
  from,
  to,
  subject,
  text?,
  html?,
  apiHost?,
}): Promise<{ id: string; message: string }>
```

`apiHost` defaults to `api.eu.mailgun.net`. A host without `http://` or
`https://` is prefixed with `https://`.

## Repository-only example

From code that can resolve this repository's source directly:

```ts
import { sendEmail } from './src/Mailgun'

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

## Behavior

- Sends a multipart `POST` to `/v3/{domainName}/messages`.
- Uses HTTP Basic authentication.
- Throws on non-2xx responses and includes the returned body in the error.
- Throws when a successful response is not JSON.

## Security

- Keep the API key outside source control and logs.
- Use HTTPS; the helper accepts an explicit HTTP URL but does not enforce TLS.
- Sanitize or restrict provider error bodies before returning them to clients.
- Exporting this helper publicly would be a package API decision and is not
  implied by this internal documentation.
