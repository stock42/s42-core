 # ViewTemplates

Esta función se utiliza para renderizar una plantilla de vista.

## Uso

```typescript
ViewTemplates(templateFilePath: string, data: Data): string
```

La función toma dos parámetros:

1. El path al archivo de la plantilla.
2. Los datos que se utilizarán en la plantilla.

El archivo de extensión de la plantilla debe ser `.view`.

### Parametros

| Name | Type | Description |
| ---- | ---- | ----------- |
| templateFilePath | string | The path to the template file.
| data | Data | The data to be used in the template.


## Example

```typescript
import { ViewTemplates } from 's42-core'
import path from 'path'

const params = {
  template: 'welcome',
  context: {
    name: 'John Doe',
    email: 'john@doe.com'
  }
}
const template = loadTemplate(path.join(__dirname, '../mailtemplate', params.template + '.view'), params.context)

```

