---
title: S42Core SSE Clase
description: La clase SSE proporciona una interfaz simplificada para manejar Server-Sent Events (SSE) en una aplicación Bunjs. Proporciona una forma sencilla de enviar eventos desde el servidor a los clientes conectados utilizando el protocolo de Server-Sent Events.
---


# SSE - s42-core

La clase `SSE` (Server-Sent Events) del paquete `s42-core` simplifica la creación de flujos de comunicación en tiempo real en aplicaciones web. Proporciona una forma fácil de enviar eventos desde el servidor a los clientes conectados utilizando el protocolo de Server-Sent Events.

---

## Propósito

`SSE` está diseñado para la comunicación en tiempo real, unidireccional, del servidor al cliente. Es particularmente útil en escenarios como:

- Notificaciones en vivo (por ejemplo, nuevos mensajes, actualizaciones del sistema).
- Monitoreo en tiempo real (por ejemplo, precios de acciones, estado del servidor).
- Difusión de eventos (por ejemplo, actividad del usuario en aplicaciones colaborativas).

---

## Instalación

Instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Características

1. **Comunicación en tiempo real**: Envía eventos del servidor a los clientes con un overhead mínimo.
2. **Difusión de eventos**: Transmite eventos a múltiples clientes simultáneamente.
3. **Fácil de usar**: API sencilla para gestionar conexiones y enviar eventos.
4. **Integración con Controladores**: Funciona perfectamente con las clases `Controller` y `RouteControllers`.

---

## Uso

### Configuración de SSE en un Controlador

```typescript
import { SSE, Controller, RouteControllers, Server } from 's42-core';

// Mapa para almacenar los listeners SSE
const sseListeners = new Map<string, Function>();

// Controlador SSE
const sseController = new Controller('GET', '/sse', async (req, res) => {
  const sse = new SSE(req);
  sseListeners.set(sse.getUUID(), (eventName: string, eventPayload: Record<string, any>) => {
    sse.send({ eventName, eventPayload });
  });

  return sse.getResponse();
});

// Controlador 404 de ejemplo
const controller404 = new Controller('*', '*', async (req, res) => {
  console.info('404 - No se encontró una ruta correspondiente');
  sseListeners.forEach((listener, uuid) => {
    listener('404', { url: req.url });
  });

  return res.text('No encontrado');
});

// Iniciar el servidor
(async () => {
  const server = new Server();

  await server.start({
    port: 4555,
    RouteControllers: new RouteControllers([
      sseController,
      controller404,
    ]),
  });

  console.info(`Servidor iniciado en el puerto: ${server.getPort()}`);
})();
```

---

### Enviar Eventos

Para transmitir eventos a todos los clientes conectados:

```typescript
sseListeners.forEach((listener) => {
  listener('nombre_evento', { mensaje: '¡Hola Mundo!' });
});
```

---

## Ejemplo de Escenario

### Caso de Uso: Notificaciones en Tiempo Real

1. **Conexión del Cliente**: Los clientes se conectan al endpoint `/sse` para establecer una conexión SSE.
2. **Transmisión de Eventos**: El servidor transmite eventos (por ejemplo, nuevas notificaciones) a todos los clientes conectados.

#### Ejemplo del Lado del Cliente (JavaScript)

```javascript
const eventSource = new EventSource('/sse');

eventSource.onmessage = (event) => {
  console.log('Recibido:', event.data);
};

eventSource.addEventListener('nombre_evento', (event) => {
  console.log('Evento Personalizado:', JSON.parse(event.data));
});
```

---

## Métodos

### Constructor

```typescript
constructor(req: Request)
```

- **`req`**: El objeto `Request` de la solicitud HTTP entrante.

### `getResponse(): Response`

Devuelve el objeto `Response` para enviar de vuelta al cliente.

### `getUUID(): string`

Devuelve un identificador único para la instancia SSE.

### `send(data: TypeSSEventToSend): void`

Envía un evento al cliente conectado.

- **`data`**: Un objeto que contiene:
  - `eventName`: El nombre del evento.
  - `eventPayload`: La carga útil del evento.

### `close(): void`

Cierra la conexión SSE.

---

## Integración con s42-core

La clase `SSE` funciona perfectamente con las clases `Controller`, `RouteControllers` y `Server` del paquete `s42-core`. Está diseñada para integrarse fácilmente en la arquitectura de tu aplicación.

---

## Ventajas

- **Ligero**: Configuración mínima para comunicación en tiempo real.
- **Escalable**: Maneja múltiples conexiones de manera eficiente.
- **API Simple**: Métodos intuitivos para gestionar conexiones SSE.
- **Flexibilidad de Eventos**: Soporta eventos personalizados y cargas útiles de datos.

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.