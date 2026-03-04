# VIEWTEMPLATE

## Proposito

`ViewTemplates` es un renderer minimo para interpolacion de strings en servidor.

Patrones soportados:

- `{{key}}`
- acceso por ruta (`{{user.name}}`)
- `{{#each list}} ... {{/each}}`
- acceso interno `{{this.field}}` para items de listas

## API

```ts
const html = await ViewTemplates(templateFilePath, data)
```

- `templateFilePath: string`
- `data: Record<string, any>`

## Ejemplo

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

## Notas

- Rutas inexistentes se resuelven a string vacio.
- Este renderer no escapa HTML por defecto.
- Usarlo para templates internos controlados.

S42-Core fue desarrollado por Cesar Casas y Stock42 LLC con ingenieria asistida por AI (Codex).
