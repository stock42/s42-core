# MAILGUN.md

## Overview

This document describes the `sendEmail` function, which allows you to send emails via the [Mailgun](https://www.mailgun.com/) API. The function is written in TypeScript and can be used in a browser or server environment that supports the native `fetch` and `FormData` APIs.

## Installation

Para usar esta función en tu proyecto:

1. **Instalar Dependencias**
   - No se necesitan librerías adicionales para esta función, ya que depende de las API nativas de `fetch` y `FormData` .
   - Asegúrate de que tu entorno las soporte o que cuentes con los polyfills necesarios si estás apuntando a navegadores antiguos..

2. **Importar la funcion**
   - Ensure that you have a valid Mailgun account and domain.

## Usage

1. Import the function and its types:

```typescript
import { sendEmail, MailgunParams, MailgunResponse } from 's42-core';
async function run() {
  try {
    const response: MailgunResponse = await sendEmail({
      domainName: 'YOUR_MAILGUN_DOMAIN',
      username: 'api', // Typically "api" for Mailgun
      password: 'YOUR_MAILGUN_API_KEY',
      from: 'sender@yourdomain.com',
      to: 'recipient@example.com',
      subject: 'Hello from Mailgun',
      text: 'This is a text email!',
      // Optional fields:
      // html: '<h1>Hello from Mailgun</h1>',
      // apiHost: 'api.eu.mailgun.net' // Use this if your domain is registered on Mailgun's EU region
    });
    console.log('Mailgun Response:', response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

run();
```
