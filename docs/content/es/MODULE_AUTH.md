# Modulo Auth (`type: "mws"`)

`auth` es un modulo middleware de S42-Core.

## Objetivo

Proveer hooks de autenticacion ejecutables bajo demanda por controladores `full`.

## Estructura requerida

```text
auth/
  __module__.ts
  mws/
    index.ts
```

## Contrato `__module__.ts`

```ts
export default {
  name: 'auth',
  version: '1.0.0',
  type: 'mws',
  dependencies: [],
}
```

## Contrato `mws/index.ts`

Debe exportar:

- `default` (constructor/init)
- `beforeRequest`
- `afterRequest` (o alias `exportRequest`)

## Ejecucion on-demand

No se ejecuta globalmente por defecto.
Un controlador `full` debe declararlo:

- `requireBefore: ['mws']` para todos los middleware modules
- `requireBefore: ['auth']` para este modulo puntual
- `requireAfter` / `afterRequest` para post-procesamiento

## Recomendaciones

- Responder 401/403 de forma consistente.
- Evitar filtrar errores internos de parsing/verificacion de token.
- Mantener el middleware determinista y liviano.
