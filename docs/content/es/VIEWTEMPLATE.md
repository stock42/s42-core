# VIEWTEMPLATE (INTERNO)

## Estado de API pública

`src/ViewTemplates` contiene un renderer pequeño de templates de texto, pero
`ViewTemplates` no está exportado por `src/index.ts` ni por el export map.

No existe un import `s42-core/...` soportado para consumidores. Esta página es
referencia exclusiva para maintainers del repositorio.

## API interna

```ts
ViewTemplates(
  templateFilePath: string,
  data: Record<string, unknown>,
): Promise<string>
```

Patrones soportados:

- `{{key}}`
- paths anidados como `{{user.name}}`
- `{{#each list}} ... {{/each}}`
- `{{this.field}}` dentro de each

## Ejemplo solo para el repositorio

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

Los paths inexistentes se renderizan como string vacío.

## Seguridad

El renderer no escapa HTML. Valores provenientes de usuarios, APIs externas o
bases de datos pueden producir XSS al insertarse en HTML.

Usar solamente contenido controlado o aplicar una capa aprobada de escaping
contextual. No tratar este helper como un template engine HTML seguro de
propósito general.
