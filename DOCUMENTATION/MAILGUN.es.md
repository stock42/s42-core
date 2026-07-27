# MAILGUN (INTERNO)

## Estado de API pública

`src/Mailgun` contiene el helper `sendEmail()`, pero no está exportado por
`src/index.ts` ni por el export map del paquete.

Los consumidores no pueden usar `s42-core/dist/Mailgun` ni otro deep import.
Esta página es referencia exclusiva para maintainers del repositorio.

## API interna

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

`apiHost` usa por default `api.eu.mailgun.net`. A un host sin `http://` o
`https://` se le antepone `https://`.

## Ejemplo solo para el repositorio

Desde código que puede resolver directamente el source del repositorio:

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

## Comportamiento

- Envía un `POST` multipart a `/v3/{domainName}/messages`.
- Usa autenticación HTTP Basic.
- Lanza error ante respuestas no 2xx e incluye el body recibido.
- Lanza error si una respuesta exitosa no es JSON.

## Seguridad

- Mantener la API key fuera del código fuente y logs.
- Usar HTTPS; el helper acepta una URL HTTP explícita pero no fuerza TLS.
- Sanitizar o restringir los bodies de error del provider antes de devolverlos
  a clientes.
- Exportar el helper sería una decisión de API del paquete y no está implícito
  en esta documentación interna.
