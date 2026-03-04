# RoadMap S42 Core

- [ ] CLI Auto generación de proyecto.
- [ ] Modulos
- [ ] remove redis dependency


## Modules

Un modulo es una entidad que contiene una o mas funcionalidades relacionadas.
Define modelo, servicio, storage, types, controllers, etc.

Exporta un object que las siguiente estructura:

```typescript
const Model = z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
})

const Service = z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
})

const Controllers = z.array(z.object({
  name: z.string(),
  version: z.string(),
  handler: z.function(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
}))

const Types = z.object(z.record(z.string(), z.any()))
```

```typescript
{
  name: string,
  version: string,
  models: Model[],
  services: Service[],
  types: Types,
  controllers: Controllers[],
}
```