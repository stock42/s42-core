# Módulo Share (`type: "share"`)

Un módulo `share` registra metadata de código reutilizable sin imports
automáticos de runtime.

## Manifest

```ts
export default {
	name: 'share',
	version: '1.0.0',
	type: 'share',
	enabled: true,
}
```

## Estructura sugerida

```text
share/
  __module__.ts
  constants/
  helpers/
  services/
  types/
  utils/
```

## Comportamiento

- Carga después de `mws` y antes de `full`.
- Registra el manifest normalizado en estadísticas de módulos.
- Ejecuta `initialize` opcional.
- No importa automáticamente services, types, models u otras carpetas.
- Ignora `controllers/`, `events/` y `mws/` con un warning.

Los consumidores acceden al código compartido mediante imports normales del
proyecto.

`dependencies` continúa siendo metadata; el loader no lo exige.

## Guía

- Mantener contratos compartidos versionados y sin side effects.
- Conservar lógica de negocio de dominio en un módulo `full`.
- Usar `initialize` solamente para un side effect one-time intencional.
