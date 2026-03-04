# MAILGUN

## Proposito

`sendEmail` es un helper liviano para enviar emails por Mailgun desde servicios S42-Core.

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

## Ejemplo

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

## Recomendaciones operativas

- Guardar credenciales en variables de entorno.
- Validar host API y usar endpoint HTTPS.
- Manejar respuestas no-2xx de forma explicita en servicios consumidores.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
