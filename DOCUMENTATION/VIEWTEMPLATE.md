# VIEWTEMPLATE (INTERNAL)

## Public API status

`src/ViewTemplates` contains a small string template renderer, but
`ViewTemplates` is not exported by `src/index.ts` or the package export map.

There is no supported `s42-core/...` import for package consumers. This page is
repository-maintainer reference only.

## Internal API

```ts
ViewTemplates(
  templateFilePath: string,
  data: Record<string, unknown>,
): Promise<string>
```

Supported patterns:

- `{{key}}`
- nested paths such as `{{user.name}}`
- `{{#each list}} ... {{/each}}`
- `{{this.field}}` inside each blocks

## Repository-only example

```ts
import { ViewTemplates } from './src/ViewTemplates'

const html = await ViewTemplates('./views/users.html', {
	title: 'Operators',
	users: [{ name: 'Ada' }, { name: 'Linus' }],
})
```

Template:

```html
<h1>{{title}}</h1>
<ul>
	{{#each users}}
	<li>{{this.name}}</li>
	{{/each}}
</ul>
```

Missing paths render as an empty string.

## Security

The renderer performs no HTML escaping. Values from users, external APIs, or
databases can create XSS when inserted into HTML.

Use only controlled content or apply an approved context-aware escaping layer.
Do not treat this helper as a general-purpose safe HTML template engine.
