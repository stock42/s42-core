- [EventsDomain - s42-core](#eventsdomain---s42-core)
	- [Propósito](#propósito)
	- [Instalación](#instalación)
	- [Características](#características)
	- [Uso](#uso)
		- [Configuración de EventsDomain](#configuración-de-eventsdomain)
		- [Registrar un Listener de Eventos](#registrar-un-listener-de-eventos)
		- [Emitir Eventos](#emitir-eventos)
		- [Cerrar EventsDomain](#cerrar-eventsdomain)
	- [Ejemplo Completo](#ejemplo-completo)
		- [Escenario: Servicio de Registro de Usuarios y Servicio de Correo Electrónico](#escenario-servicio-de-registro-de-usuarios-y-servicio-de-correo-electrónico)
			- [Servicio de Registro de Usuarios](#servicio-de-registro-de-usuarios)
			- [Servicio de Correo Electrónico](#servicio-de-correo-electrónico)
	- [Métodos](#métodos)
		- [`getInstance(redisInstance: RedisClient, uuid: string): EventsDomain`](#getinstanceredisinstance-redisclient-uuid-string-eventsdomain)
		- [`listenEvent<TypePayload>(eventName: string, callback: (payload: TypePayload) => void): void`](#listeneventtypepayloadeventname-string-callback-payload-typepayload--void-void)
		- [`emitEvent(eventName: string, payload: object): boolean`](#emiteventeventname-string-payload-object-boolean)
		- [`getAllRegisteredEvents(): Record<string, TypeEvent>`](#getallregisteredevents-recordstring-typeevent)
		- [`close(): void`](#close-void)
	- [Ventajas](#ventajas)
	- [Licencia](#licencia)


# EventsDomain - s42-core

La clase `EventsDomain` es una utilidad central del paquete `s42-core`, diseñada para facilitar la comunicación basada en eventos entre microservicios o células en un sistema distribuido. Permite la publicación, escucha y enrutamiento de eventos a través de Redis, asegurando interacciones eficientes y desacopladas entre servicios independientes.

---

## Propósito

La clase `EventsDomain` es particularmente útil en escenarios donde los microservicios o células necesitan interactuar de manera indirecta mediante eventos. Por ejemplo:

- **Registro de usuarios y envío de correos electrónicos**: Un servicio de registro de usuarios emite un evento cuando se crea un nuevo usuario. El servicio de correos electrónicos escucha este evento para enviar un correo de bienvenida.
- **Procesamiento de pedidos y notificaciones**: Un servicio de procesamiento de pedidos emite eventos que activan notificaciones a los clientes a través de un servicio de notificaciones independiente.
- **Actualizaciones en tiempo real**: Los eventos pueden utilizarse para actualizar clientes en la interfaz de usuario o desencadenar acciones específicas en otros servicios.

---

## Instalación

Instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Características

1. **Difusión de eventos**: Publica eventos que pueden ser consumidos por otros servicios.
2. **Registro de escuchas**: Registra fácilmente escuchas para eventos específicos.
3. **Enrutamiento dinámico de eventos**: Soporta el enrutamiento de eventos a instancias específicas.
4. **Integración con Redis**: Utiliza Redis para una comunicación confiable y eficiente.
5. **Instancia Singleton**: Asegura una única instancia de `EventsDomain` en toda la aplicación.

---

## Uso

### Configuración de EventsDomain

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

// Inicializa el cliente de Redis
const redisClient = RedisClient.getInstance('redis://localhost:6379');

// Identificador único para el proceso
const processUUID = 'unique-process-id';

// Crea una instancia de EventsDomain
const eventsDomain = EventsDomain.getInstance(redisClient, processUUID);
```

---

### Registrar un Listener de Eventos

Puedes escuchar eventos específicos y activar un callback cuando ocurra el evento:

```typescript
eventsDomain.listenEvent<{ userId: string }>('user_registered', (payload) => {
  console.info('Nuevo usuario registrado:', payload.userId);
});
```

---

### Emitir Eventos

Para emitir un evento que pueda ser consumido por otros servicios:

```typescript
const success = eventsDomain.emitEvent('user_registered', { userId: '12345' });
if (success) {
  console.info('Evento emitido con éxito.');
} else {
  console.error('Error al emitir el evento. Es posible que no esté registrado.');
}
```

---

### Cerrar EventsDomain

Al cerrar el servicio, libera los recursos:

```typescript
eventsDomain.close();
console.info('EventsDomain cerrado.');
```

---

## Ejemplo Completo

### Escenario: Servicio de Registro de Usuarios y Servicio de Correo Electrónico

#### Servicio de Registro de Usuarios

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

const redisClient = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisClient, 'user-service');

function registerUser(userId: string) {
  console.info('Registrando usuario:', userId);
  // Lógica para registrar usuario...

  // Emitir evento después del registro
  eventsDomain.emitEvent('user_registered', { userId });
}
```

#### Servicio de Correo Electrónico

```typescript
import { EventsDomain } from 's42-core';
import { RedisClient } from 's42-core';

const redisClient = RedisClient.getInstance('redis://localhost:6379');
const eventsDomain = EventsDomain.getInstance(redisClient, 'email-service');

eventsDomain.listenEvent<{ userId: string }>('user_registered', (payload) => {
  console.info('Enviando correo de bienvenida al usuario:', payload.userId);
  // Lógica para enviar correo electrónico...
});
```

---

## Métodos

### `getInstance(redisInstance: RedisClient, uuid: string): EventsDomain`

Devuelve una instancia singleton de `EventsDomain`.

- **`redisInstance`** *(RedisClient)*: Instancia del cliente Redis para la comunicación.
- **`uuid`** *(string)*: Identificador único para el proceso.

### `listenEvent<TypePayload>(eventName: string, callback: (payload: TypePayload) => void): void`

Registra un listener para un evento específico.

- **`eventName`** *(string)*: Nombre del evento a escuchar.
- **`callback`** *(function)*: Función que se ejecutará cuando se reciba el evento.

### `emitEvent(eventName: string, payload: object): boolean`

Emite un evento para ser consumido por otros servicios.

- **`eventName`** *(string)*: Nombre del evento a emitir.
- **`payload`** *(object)*: Datos que se enviarán con el evento.

### `getAllRegisteredEvents(): Record<string, TypeEvent>`

Devuelve todos los eventos registrados.

### `close(): void`

Detiene la difusión de eventos y libera las conexiones de Redis.

---

## Ventajas

- **Desacoplamiento**: Los servicios pueden comunicarse sin dependencias directas.
- **Escalabilidad**: Maneja fácilmente múltiples instancias y distribuye eventos eficientemente.
- **Confiabilidad**: Utiliza Redis para una mensajería robusta entre servicios.
- **Simplicidad**: Proporciona una API sencilla para gestionar eventos.

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.