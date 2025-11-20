# Documentación de la Clase Server

## Resumen

La clase `Server` es una implementación robusta para gestionar servidores HTTP utilizando Bun.js. Soporta clustering, hooks, manejo personalizable de solicitudes y gestión de errores. Esta documentación proporciona una descripción general de sus características, opciones de configuración y un ejemplo de implementación.

---

## Características

- **Soporte para Clustering**: Distribuye la carga entre múltiples procesos.
- **Hooks**: Permite agregar hooks personalizados para extender funcionalidades.
- **Gestión de Errores**: Respuestas de error personalizables.
- **Rutas Dinámicas**: Se integra con `RouteControllers` para gestionar rutas.
- **Comunicación entre Clusters**: Facilita la comunicación entre workers y clusters.
- **Health Check**: Incluye un endpoint estático `/health-check`.
- **Configuración Personalizable**: Soporta personalización de tiempo de espera, tamaño del cuerpo y opciones de desarrollo.

---

## Constructor

```typescript
constructor()
```
- Inicializa la instancia del `Server` y escucha mensajes de comunicación entre clusters.

---

## Métodos

### start(properties: TypeServerConstructor): Promise<void>
Inicia el servidor con la configuración especificada.

#### Parámetros:
- **port** (number): El puerto en el que escucha el servidor. Por defecto, `0`.
- **clustering** (boolean): Habilita la reutilización de puertos para clustering. Por defecto, `false`.
- **idleTimeout** (number): Tiempo máximo de inactividad en segundos antes de cerrar una conexión. Por defecto, `300`.
- **maxRequestBodySize** (number): Tamaño máximo (en bytes) del cuerpo de la solicitud. Por defecto, `1,000,000`.
- **error** (function): Manejador de errores personalizado. Recibe un objeto `Error` y devuelve una `Response`.
- **hooks** (TypeHook[]): Arreglo de hooks para ejecutar durante las operaciones del servidor.
- **RouteControllers** (RouteControllers): Gestiona rutas y su lógica correspondiente.
- **development** (boolean): Indica si el servidor está en modo desarrollo. Por defecto, `false`.
- **awaitForCluster** (boolean): Retrasa el inicio del servidor hasta que se establezca la comunicación con el cluster. Por defecto, `false`.

#### Ejemplo:
```typescript
await server.start({
  port: 4555,
  clustering: true,
  idleTimeout: 30,
  maxRequestBodySize: 1024 * 1024 * 10,
  development: true,
  awaitForCluster: true,
  RouteControllers: new RouteControllers([
    myTestController
  ]),
});
```

### getPort(): number | undefined
Devuelve el puerto en el que se está ejecutando el servidor.

### getURL(): string | undefined
Devuelve la URL completa del servidor.

### isStartedFromCluster(): boolean
Indica si el servidor fue iniciado como parte de un cluster.

### getClusterName(): string
Devuelve el nombre del cluster al que pertenece el servidor.

### sendMessageToCluster(message: string): void
Envía un mensaje al cluster principal.

### sendMessageToWorkers(message: string): void
Envía un mensaje a todos los procesos worker.

### onMessageFromWorkers(callback: (message: string) => void): void
Registra un callback para manejar mensajes recibidos de los procesos worker.

---

## Ejemplo de Implementación

A continuación, un ejemplo de cómo usar la clase `Server` junto con `RouteControllers`:

```typescript
import { Server, RouteControllers, Controller } from 's42-core'
(async function startServer() {
	let x =0
	const hello = new Controller('GET', '/hello', async (req, res) => {
		console.info('Hello World!')
		return res.send(`Hello World! ${x++}`)
	})

  console.info("S42-Core Framework running...")
  const apiServer = new Server()
	await apiServer.start({
		port: parseInt(String(process?.env?.PORT ?? 5678), 10),
		clustering: true,
		idleTimeout: 30,
		maxRequestBodySize: Number.MAX_SAFE_INTEGER,
		development: true,
		awaitForCluster: true,
		hooks: [
			{
				method: '*',
				path: '*',
				when: 'before',
				handle: (req, res, next) => {
					console.info('Before all request')
					next(req, res)
				}
			},
			{
				method: '*',
				path: '*',
				when: 'after',
				handle: (req, res, next) => {
					console.info('Thanks for your visit')
					next(req, res)
				}
			}
		],
		RouteControllers: new RouteControllers([hello]),
	})
	console.info(`🚀 API Running on port ${process?.env?.PORT ?? 5678}`)
})()
```

---

## Contenido Estático

- El servidor incluye una ruta estática predeterminada para verificaciones de estado:
  - URL: `/health-check`
  - Respuesta: `"All good!"`

---

## Gestión de Errores

Las respuestas de error personalizadas pueden definirse mediante la propiedad `error`:

```typescript
await server.start({
  error: (err) => new Response(`<pre>${err.message}\n${err.stack}</pre>`, {
    headers: { 'Content-Type': 'text/html' },
  }),
});
```

---

## Comunicación entre Clusters

El servidor soporta comunicación entre clusters y workers. Ejemplo:

### Enviar un Mensaje al Cluster
```typescript
server.sendMessageToCluster('Cluster started!');
```

### Recibir Mensajes de los Workers
```typescript
server.onMessageFromWorkers((message) => {
  console.log('Message from worker:', message);
});
```

---

## Notas
- Asegúrese de que la instancia de `RouteControllers` esté correctamente configurada para gestionar rutas.
- Use la opción `clustering` para alta disponibilidad y escalabilidad.
- Utilice hooks para agregar middleware o lógica de preprocesamiento.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Para más información, consulte el archivo LICENSE.

