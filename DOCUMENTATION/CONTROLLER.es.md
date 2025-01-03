- [Documentación de Controller](#documentación-de-controller)
	- [Propósito](#propósito)
	- [Instalación](#instalación)
	- [Uso](#uso)
		- [Ejemplo Básico](#ejemplo-básico)
		- [Agregar Middlewares](#agregar-middlewares)
		- [Manejar Múltiples Métodos](#manejar-múltiples-métodos)
		- [Parámetros Dinámicos](#parámetros-dinámicos)
	- [Métodos Clave](#métodos-clave)
		- [Constructor](#constructor)
		- [`getPath(): string`](#getpath-string)
		- [`getMethods(): TYPE_HTTP_METHOD[]`](#getmethods-type_http_method)
		- [`use(callback: Middleware): this`](#usecallback-middleware-this)
		- [Métodos HTTP](#métodos-http)
		- [`getCallback(): (req: Request, res: Res) => Promise<Response>`](#getcallback-req-request-res-res--promiseresponse)
	- [Ejemplo de Integración con RouteControllers](#ejemplo-de-integración-con-routecontrollers)
	- [Características](#características)
	- [Ventajas](#ventajas)
	- [Licencia](#licencia)


# Documentación de Controller

La clase `Controller` es parte del paquete `s42-core` y proporciona una manera intuitiva y flexible de definir endpoints para solicitudes HTTP. Admite enrutamiento dinámico, cadenas de middlewares y múltiples métodos HTTP para cada ruta.

Esta clase está diseñada para trabajar perfectamente con la clase `RouteControllers` para gestionar rutas de aplicación de manera eficiente.

---

## Propósito

La clase `Controller`:

- Simplifica la definición de endpoints HTTP.
- Admite middlewares para procesar solicitudes.
- Maneja múltiples métodos HTTP para un solo endpoint.
- Permite rutas con parámetros dinámicos.

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
import { Controller } from 's42-core';

const helloController = new Controller('GET', '/hello', async (req, res) => {
  return res.json({ message: 'Hola, Mundo!' });
});
```

### Agregar Middlewares

Puedes encadenar múltiples middlewares para preprocesar la solicitud. Los middlewares se ejecutan en orden y pueden devolver opcionalmente un `Response`. Si un middleware devuelve `undefined`, se ejecuta el siguiente middleware en la cadena.

```typescript
helloController.use(async (req, res) => {
  req.timestamp = Date.now(); // Agregar datos personalizados a la solicitud
});

helloController.use(async (req, res) => {
  console.info(`Solicitud recibida en: ${req.timestamp}`);
});
```

### Manejar Múltiples Métodos

Puedes agregar múltiples métodos HTTP para un solo controlador.

```typescript
helloController.post();
helloController.delete();
```

Esto permite que la misma ruta `/hello` maneje solicitudes `GET`, `POST` y `DELETE`.

### Parámetros Dinámicos

Define rutas dinámicas con parámetros:

```typescript
const userController = new Controller('GET', '/users/:userId', async (req, res) => {
  return res.json({ userId: req.params.userId });
});
```

El objeto `req.params` contiene los parámetros dinámicos analizados desde la URL.

---

## Métodos Clave

### Constructor

```typescript
constructor(method: TYPE_HTTP_METHOD, path: string, callback: Middleware);
```

- **`method`**: El método HTTP para la ruta (por ejemplo, `GET`, `POST`).
- **`path`**: La ruta (por ejemplo, `/users/:userId`).
- **`callback`**: El middleware principal para manejar la solicitud.

### `getPath(): string`
Devuelve la ruta asociada con el controlador.

### `getMethods(): TYPE_HTTP_METHOD[]`
Devuelve un array de los métodos HTTP admitidos por el controlador.

### `use(callback: Middleware): this`
Agrega un middleware al controlador. Los middlewares se ejecutan en el orden en que se agregan.

### Métodos HTTP

Estos métodos permiten agregar métodos HTTP al controlador:

- `get()`: Agrega el método `GET`.
- `post()`: Agrega el método `POST`.
- `delete()`: Agrega el método `DELETE`.
- `put()`: Agrega el método `PUT`.
- `patch()`: Agrega el método `PATCH`.
- `options()`: Agrega el método `OPTIONS`.
- `update()`: Agrega el método `UPDATE`.

### `getCallback(): (req: Request, res: Res) => Promise<Response>`
Devuelve una función callback que maneja la solicitud entrante. La función ejecuta la cadena de middlewares y devuelve un `Response`.

---

## Ejemplo de Integración con RouteControllers

La clase `Controller` está diseñada para trabajar con `RouteControllers`. Aquí tienes un ejemplo:

```typescript
import { Controller, RouteControllers, Server } from 's42-core';

const helloController = new Controller('GET', '/hello', async (req, res) => {
  return res.json({ message: 'Hola, Mundo!' });
});

const userController = new Controller('GET', '/users/:userId', async (req, res) => {
  return res.json({ userId: req.params.userId });
});

const routeControllers = new RouteControllers([
  helloController,
  userController,
]);

const server = new Server();
await server.start({
  port: 3000,
  RouteControllers: routeControllers,
});

console.info('El servidor está corriendo en:', server.getURL());
```

---

## Características

1. **Enrutamiento Dinámico**: Admite rutas estáticas, dinámicas y con comodines.
2. **Soporte para Middlewares**: Permite el procesamiento en capas de las solicitudes.
3. **Métodos Flexibles**: Maneja múltiples métodos HTTP para una sola ruta.
4. **Listo para Integración**: Diseñado para trabajar con `RouteControllers` para un enrutamiento eficiente.

---

## Ventajas

- **Modular**: Permite definir endpoints como módulos independientes.
- **Encadenable**: Agrega métodos y middlewares de manera fluida.
- **Manejo de Errores**: Incluye manejo robusto de errores en las cadenas de middlewares.
- **Parámetros Dinámicos**: Admite rutas parametrizadas para un enrutamiento flexible.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

