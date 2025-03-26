# MAILGUN.md

## Overview

This document describes the `sendEmail` function, which allows you to send emails via the [Mailgun](https://www.mailgun.com/) API. The function is written in TypeScript and can be used in a browser or server environment that supports the native `fetch` and `FormData` APIs.

## Installation

To use this function in your project:

1. **Install Dependencies**
   - No additional libraries are needed for this function, as it relies on the native `fetch` and `FormData` APIs.
   - Make sure your environment supports them or that you have the necessary polyfills if you are targeting older browsers.

2. **Add the Function**
   - Copy the `sendEmail` function to your codebase.
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
