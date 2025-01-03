- [Documentación de Cluster](#documentación-de-cluster)
	- [Propósito](#propósito)
	- [Instalación](#instalación)
	- [Uso](#uso)
		- [Ejemplo Básico](#ejemplo-básico)
	- [Constructor](#constructor)
	- [Métodos Principales](#métodos-principales)
		- [`start(file: string, fallback: (err: Error) => void): void`](#startfile-string-fallback-err-error--void-void)
		- [`onWorkerMessage(callback: (message: string) => void): void`](#onworkermessagecallback-message-string--void-void)
		- [`sendMessageToWorkers(message: string): void`](#sendmessagetoworkersmessage-string-void)
		- [`getCurrentFile(): string`](#getcurrentfile-string)
		- [`getCurrentWorkers(): Array<ReturnType<typeof spawn>>`](#getcurrentworkers-arrayreturntypetypeof-spawn)
		- [`killWorkers(): void`](#killworkers-void)
	- [Características](#características)
	- [Ejemplo Completo](#ejemplo-completo)
	- [Ventajas](#ventajas)
	- [Licencia](#licencia)

# Documentación de Cluster

La clase `Cluster` es parte del paquete `s42-core` y permite la creación y gestión de procesos en paralelo utilizando workers de Bun. Está diseñada para simplificar la distribución de tareas en aplicaciones que necesitan aprovechar múltiples CPUs o gestionar procesos independientes.

---

## Propósito

La clase `Cluster`:

- Crea y gestiona múltiples workers de forma eficiente.
- Admite mensajes bidireccionales entre el proceso principal y los workers.
- Incluye soporte para reiniciar automáticamente los workers en modo desarrollo (`--watch`).
- Maneja errores y proporciona una API simple para integración.

---

## Instalación

Instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Uso

### Ejemplo Básico

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 4,
  watchMode: true, // Activa el reinicio automático en modo desarrollo
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});
```

---

## Constructor

```typescript
constructor(props: TypeConstructor & { watchMode?: boolean });
```

- **`props.name`** *(string)*: Nombre del cluster.
- **`props.maxCPU`** *(number)*: Máximo número de CPUs a utilizar.
- **`props.watchMode`** *(boolean, opcional)*: Habilita el reinicio automático de los workers en modo desarrollo (`--watch`).

---

## Métodos Principales

### `start(file: string, fallback: (err: Error) => void): void`

Inicia el cluster y crea los workers.

- **`file`** *(string)*: Archivo que ejecutan los workers.
- **`fallback`** *(function)*: Callback que se ejecuta si ocurre un error al iniciar el cluster.

```typescript
cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});
```

### `onWorkerMessage(callback: (message: string) => void): void`

Registra un callback para manejar mensajes enviados por los workers al proceso principal.

```typescript
cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});
```

### `sendMessageToWorkers(message: string): void`

Envía un mensaje a todos los workers activos.

```typescript
cluster.sendMessageToWorkers('Hello Workers!');
```

### `getCurrentFile(): string`

Devuelve el archivo actualmente ejecutado por los workers.

```typescript
console.info('Current file:', cluster.getCurrentFile());
```

### `getCurrentWorkers(): Array<ReturnType<typeof spawn>>`

Devuelve una lista de los workers activos.

```typescript
console.info('Active workers:', cluster.getCurrentWorkers());
```

### `killWorkers(): void`

Finaliza todos los workers activos de manera segura.

```typescript
process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Características

1. **Paralelismo**: Aprovecha todas las CPUs disponibles o un número específico de ellas.
2. **Mensajería**: Soporte para mensajes bidireccionales entre el proceso principal y los workers.
3. **Modo Desarrollo**: Reinicio automático de los workers con la opción `--watch`.
4. **Manejo de Errores**: Callbacks para manejar errores durante la inicialización.
5. **Integración Sencilla**: Diseñada para integrarse fácilmente en aplicaciones.

---

## Ejemplo Completo

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 2,
  watchMode: true,
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Failed to start the cluster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Message from worker:', message);
});

cluster.sendMessageToWorkers('Hello Workers!');

process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Ventajas

- **Modularidad**: Diseñada para manejar procesos paralelos de forma sencilla.
- **Eficiencia**: Aprovecha los recursos del sistema al máximo.
- **Flexibilidad**: Configurable para diferentes entornos (desarrollo/producción).
- **Simplicidad**: API intuitiva y bien documentada.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

