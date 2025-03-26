# ViewTemplates

This function is used to render a view template.

## Usage

```typescript
ViewTemplates(templateFilePath: string, data: Data): string
```

The function takes two parameters:

1. The path to the template file.
2. The data to be used in the template.

The file extension of the template file should be `.view`.
### Parameters

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

