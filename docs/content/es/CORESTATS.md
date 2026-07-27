# CORESTATS

## Propósito

`CoreStats` informa los registros de controllers/módulos de S42-Core y output de
comandos del host.

## Ruta automática

Definir el entorno antes de construir `RouteControllers`:

```bash
ENABLE_CORE_STATS=true
```

Los valores habilitados aceptados son `true` y `1` (sin importar mayúsculas,
luego de trim). Al habilitarlo, `RouteControllers` inyecta
`GET /core/stats`, salvo que ya exista ese método/path exacto.

El bootstrap normal no necesita una instancia explícita:

```ts
const modules = new Modules('./modules')
await modules.load()

await new Server().start({
	port: 5678,
	RouteControllers: new RouteControllers(modules.getControllers()),
	hooks: modules.getHooks(),
})
```

Cambiar el entorno después de construir `RouteControllers` no agrega una ruta
al router existente.

## Seguridad

`CoreStats` no agrega autenticación ni autorización. Su respuesta expone:

- todos los endpoints registrados;
- nombres, versiones, tipos y manifest de módulos cargados;
- output de memoria y disco;
- uptime;
- usuarios conectados informados por `who`;
- output de frecuencia de CPU.

Mantenerlo deshabilitado en servicios públicos salvo que la ruta esté protegida
por una frontera confiable de autenticación y red. Los hooks globales actuales
no cortan la ejecución al retornar una respuesta; no asumir que ese retorno
protege el endpoint.

## Instancia manual

```ts
const stats = new CoreStats({
	enabled: true,
	path: '/internal/core/stats',
	commandRunner: async command => ({
		command,
		ok: true,
		output: '',
	}),
})
```

Opciones:

- `enabled?: boolean` sobrescribe el entorno para esa instancia.
- `path?: string` define su path normalizado.
- `commandRunner?` reemplaza la ejecución de comandos, principalmente para
  tests o entornos controlados.

Un path manual no reconfigura la ruta singleton automática, que continúa siendo
`/core/stats`.

## API

- `isEnabled(): boolean`
- `getPath(): string`
- `getController(): Controller | null`
- `getStats(): Promise<CoreStatsPayload>`

## Respuesta

Incluye:

- `generatedAt`, `path` y `enabled`;
- totales de controllers, endpoints y módulos por tipo;
- arrays `endpoints` y `modules`;
- `system.memory`, `system.disk`, `system.uptime`,
  `system.connectedUsers` y `system.cpuFrequency`;
- para cada comando, `ok` y `raw`.

Comandos ejecutados:

- `free -m`
- `df -h`
- `uptime`
- `who`
- `cpupower frequency-info`

Un comando ausente no falla el endpoint. Su sección informa `ok: false` con el
texto del error, mientras el payload superior continúa con `ok: true`.

## Comportamiento del registro

Las estadísticas de controllers y módulos son globales al proceso. Un
controller se registra al construirse y un módulo al cargarse. En un cluster
multiproceso, cada worker informa el estado de su propio proceso.
