---
title: S42-Core Cluster Clase
description: Usa la clase Cluster para generar varios forks de tu servicios.
---

- [Documentación de Cluster](#documentación-de-cluster)
	- [Propósito](#propósito)
	- [Instalación](#instalación)
	- [Uso](#uso)
		- [Ejemplo básico](#ejemplo-básico)
	- [Constructor](#constructor)
	- [Métodos clave](#métodos-clave)
		- [`start(file: string, fallback: (err: Error) => void): void`](#startfile-string-fallback-err-error--void-void)
		- [`onWorkerMessage(callback: (message: string) => void): void`](#onworkermessagecallback-message-string--void-void)
		- [`sendMessageToWorkers(message: string): void`](#sendmessagetoworkersmessage-string-void)
		- [`getCurrentFile(): string`](#getcurrentfile-string)
		- [`getCurrentWorkers(): Array<ReturnType<typeof spawn>>`](#getcurrentworkers-arrayreturntypetypeof-spawn)
		- [`killWorkers(): void`](#killworkers-void)
	- [Características](#características)
	- [Ejemplo completo](#ejemplo-completo)
	- [Ventajas](#ventajas)
	- [Licencia](#licencia)

# Documentación de Cluster

La clase `Cluster` forma parte del paquete `s42-core` y permite la creación y gestión de procesos paralelos utilizando trabajadores de Bun. Simplifica la distribución de tareas en aplicaciones que necesitan utilizar múltiples CPUs o manejar procesos independientes.

---

## Propósito

La clase `Cluster`:

- Crea y gestiona múltiples trabajadores de manera eficiente.
- Soporta mensajes bidireccionales entre el proceso principal y los trabajadores.
- Incluye soporte para reinicios automáticos de los trabajadores en modo de desarrollo (`--watch`).
- Maneja errores y proporciona una API simple para integración.

---

## Instalación

Instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Uso

### Ejemplo básico

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 4,
  watchMode: true, // Habilita reinicios automáticos de los trabajadores en modo desarrollo
  args: ['--experimental-modules'], // Pasa argumentos adicionales a los trabajadores
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Error al iniciar el clúster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Mensaje del trabajador:', message);
});
```

---

## Constructor

```typescript
constructor(props: TypeConstructor & { watchMode?: boolean; args?: string[] });
```

- **`props.name`** *(string)*: Nombre del clúster.
- **`props.maxCPU`** *(number)*: Número máximo de CPUs a utilizar.
- **`props.watchMode`** *(boolean, opcional)*: Habilita reinicios automáticos de los trabajadores en modo de desarrollo (`--watch`).
- **`props.args`** *(string[], opcional)*: Array de argumentos que se pasan al script ejecutado por los trabajadores.

---

## Métodos clave

### `start(file: string, fallback: (err: Error) => void): void`

Inicia el clúster y crea los trabajadores.

- **`file`** *(string)*: Archivo que será ejecutado por los trabajadores.
- **`fallback`** *(function)*: Callback que se ejecuta si ocurre un error al iniciar el clúster.

```typescript
cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Error al iniciar el clúster:', err);
  }
});
```

### `onWorkerMessage(callback: (message: string) => void): void`

Registra un callback para manejar mensajes enviados por los trabajadores al proceso principal.

```typescript
cluster.onWorkerMessage((message) => {
  console.info('Mensaje del trabajador:', message);
});
```

### `sendMessageToWorkers(message: string): void`

Envía un mensaje a todos los trabajadores activos.

```typescript
cluster.sendMessageToWorkers('Hello Workers!');
```

### `getCurrentFile(): string`

Devuelve el archivo que actualmente está siendo ejecutado por los trabajadores.

```typescript
console.info('Archivo actual:', cluster.getCurrentFile());
```

### `getCurrentWorkers(): Array<ReturnType<typeof spawn>>`

Devuelve una lista de los trabajadores activos.

```typescript
console.info('Trabajadores activos:', cluster.getCurrentWorkers());
```

### `killWorkers(): void`

Detiene de forma segura todos los trabajadores activos.

```typescript
process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Características

1. **Paralelismo**: Utiliza todos los CPUs disponibles o un número especificado de ellos.
2. **Mensajería**: Soporta mensajes bidireccionales entre el proceso principal y los trabajadores.
3. **Modo desarrollo**: Reinicios automáticos de los trabajadores con la opción `--watch`.
4. **Argumentos personalizados**: Permite pasar argumentos adicionales desde la línea de comandos a los trabajadores.
5. **Manejo de errores**: Proporciona callbacks para manejar errores durante la inicialización.
6. **Integración simple**: Diseñado para integrarse fácilmente en aplicaciones.

---

## Ejemplo completo

```typescript
import { Cluster } from 's42-core';

const cluster = new Cluster({
  name: 'MyCluster',
  maxCPU: 2,
  watchMode: true,
  args: ['--experimental-modules'],
});

cluster.start('./worker.js', (err) => {
  if (err) {
    console.error('Error al iniciar el clúster:', err);
  }
});

cluster.onWorkerMessage((message) => {
  console.info('Mensaje del trabajador:', message);
});

cluster.sendMessageToWorkers('Hello Workers!');

process.on('SIGINT', () => {
  cluster.killWorkers();
});
```

---

## Ventajas

- **Modularidad**: Diseñado para manejar procesos paralelos de manera sencilla.
- **Eficiencia**: Maximiza la utilización de recursos del sistema.
- **Flexibilidad**: Configurable para diferentes entornos (desarrollo/producción).
- **Simplicidad**: API intuitiva y bien documentada.

---

## Licencia

Este proyecto está licenciado bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.
