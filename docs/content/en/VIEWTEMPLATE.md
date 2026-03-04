# VIEWTEMPLATE

## Purpose

`ViewTemplates` is a minimal template renderer for server-side string interpolation.

Supported patterns:

- `{{key}}`
- dot path access (`{{user.name}}`)
- `{{#each list}} ... {{/each}}`
- inner `{{this.field}}` access for list items

## API

```ts
const html = await ViewTemplates(templateFilePath, data)
```

- `templateFilePath: string`
- `data: Record<string, any>`

## Example

Template:

```html
<h1>{{title}}</h1>
<ul>
  {{#each users}}
    <li>{{this.name}}</li>
  {{/each}}
</ul>
```

Runtime:

```ts
const html = await ViewTemplates('./views/users.html', {
  title: 'Operators',
  users: [{ name: 'Ada' }, { name: 'Linus' }],
})
```

## Notes

- Missing paths resolve to empty string.
- This renderer does not provide HTML escaping by default.
- Use for controlled internal templates.

S42-Core is developed by Cesar Casas and Stock42 LLC with AI-assisted engineering (Codex).
