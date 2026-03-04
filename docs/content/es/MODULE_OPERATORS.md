# Modulo Operators (`type: "full"`)

`operators` es un modulo de dominio `full`.

## Estructura recomendada

```text
operators/
  __module__.ts
  controllers/
  events/
  models/
  services/
```

## Contrato `__module__.ts`

```ts
export default {
  name: 'operators',
  version: '1.0.0',
  type: 'full',
  dependencies: [{ module: 'auth', version: 1 }],
}
```

## Contrato de controlador

Cada archivo en `controllers/` exporta un `ControllerType` con:

- `name`, `version`
- `method`, `path`
- `handler`
- `handleError` (opcional)
- `requireBefore` / `requireAfter` (opcionales)

## Middleware por ruta

- `['mws']`: ejecuta todos los modules middleware cargados.
- `['auth']`: ejecuta un middleware module puntual.

## Orden runtime

1. Cargan modules `mws`.
2. Cargan modules `share`.
3. Cargan modules `full`.
4. Se ejecutan middlewares segun referencia del controlador.

## Recomendaciones

- Mantener handlers delgados.
- Llevar logica de negocio a `services`.
- Definir contratos de eventos estables.
