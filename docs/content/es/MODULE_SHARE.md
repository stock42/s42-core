# Modulo Share (`type: "share"`)

`share` es el modulo para codigo compartido reutilizable entre dominios.

## Objetivo

Centralizar:

- services
- types
- enums
- constants
- helpers
- hooks
- models
- utils

## Contrato

```ts
export default {
  name: 'share',
  version: '1.0.0',
  type: 'share',
  dependencies: [],
}
```

## Comportamiento

- Se registra luego de `mws` y antes de `full`.
- No carga `controllers`.
- No carga `events`.
- No registra hooks HTTP.

Si existen carpetas `controllers/`, `events/` o `mws/`, se ignoran.

## Recomendaciones

- Usarlo para contratos y utilidades transversales.
- Evitar side-effects ocultos.
- Versionar cambios en tipos compartidos.
