---
title: S42-Core RouteControllers Clase
description: Define rutas dinámicas y enruta las solicitudes HTTP de manera eficiente en tus aplicaciones. Utiliza middlewares para procesar solicitudes y maneja métodos HTTP para cada ruta.
---
# Documentación de RouteControllers

La clase `RouteControllers` es parte del paquete `s42-core` y está diseñada para gestionar y enrutar solicitudes HTTP de manera eficiente. Funciona perfectamente junto con la clase `Controller` para manejar rutas, middlewares y métodos HTTP de forma dinámica.

Usar `RouteControllers` sin la clase `Controller` no tiene sentido práctico, ya que depende completamente de las instancias de `Controller` para definir y gestionar la lógica de enrutamiento.

---

## Propósito

La clase `RouteControllers` procesa una colección de instancias de `Controller` y mapea sus rutas y métodos a callbacks apropiados. Evalúa si una solicitud entrante coincide con una ruta definida, permitiendo un enrutamiento dinámico con soporte para:

- **Paths con comodines** (por ejemplo, `*` para cualquier ruta).
- **Parámetros dinámicos** (por ejemplo, `/users/:userId`).
- **Métodos HTTP con comodines** (por ejemplo, `'*'` para cualquier método).

---

## Instalación

Instala el paquete `s42-core` para usar `RouteControllers`:

```bash
npm install s42-core
```

---

## Uso

### Importar y Definir Controladores
Para usar `RouteControllers`, primero debes definir las rutas utilizando la clase `Controller`.

```typescript
import { Controller, RouteControllers, Server } from 's42-core';

async function main() {
  const server = new Server();

  // Definir controladores
  const controllerTest = new Controller('GET', '/test', async (req, res) => {
    console.info('URL:', req.url);
    return res.json({ message: 'Hola Mundo!' });
  });

  const controllerWithParams = new Controller('GET', '/users/:userId', async (req, res) => {
    console.info('Parámetros:', req.params);
    return res.json({ userId: req.params.userId });
  });

  const wildcardController = new Controller('*', '*', async (req, res) => {
    console.info('Todos los métodos y rutas');
    return res.text('Recurso no encontrado');
  });

  // Agregar middleware a un controlador
  controllerTest.use(async (req) => {
    req.extraInfo = 'datos del middleware';
  });

  // Crear RouteControllers con los controladores
  const routeControllers = new RouteControllers([
    controllerTest,
    controllerWithParams,
    wildcardController,
  ]);

  // Iniciar el servidor
  await server.start({
    port: 3000,
    RouteControllers: routeControllers,
  });

  console.info('El servidor está corriendo en:', server.getURL());
}

main();
```

---

## Métodos Clave

### `constructor(controllers: Controller[])`
Inicializa una instancia de `RouteControllers` con un array de instancias de `Controller`.

**Parámetros:**
- `controllers`: Un array de instancias de `Controller` que definen las rutas.

### `getCallback(): (req: Request) => Promise<Response>`
Devuelve una función callback para manejar solicitudes entrantes. Este callback determina si existe una ruta y ejecuta la cadena de middlewares correspondiente.

### `checkRoute(route: string): RouteCheckResult`
Evalúa si una ruta dada existe en los controladores registrados. Soporta:
- Métodos con comodines (`'*'`).
- Rutas con comodines (`'*'`).
- Parámetros dinámicos (por ejemplo, `:userId`).

**Resultado de Ejemplo:**
```typescript
{
  exists: true,
  params: { userId: '123' },
  key: 'GET:/users/:userId'
}
```

---

## Características

1. **Enrutamiento Dinámico:** Maneja rutas estáticas, parámetros dinámicos y rutas con comodines sin problemas.
2. **Soporte para Middlewares:** Integra middlewares en las instancias de `Controller` para preprocesar solicitudes.
3. **Mapeo Eficiente:** Construye una caché interna para una búsqueda rápida de rutas y callbacks.
4. **Manejo de Errores:** Devuelve respuestas apropiadas de `404` o `500` para rutas no coincidentes o errores internos.
5. **Integración Flexible:** Funciona perfectamente con la clase `Server` de `s42-core`.

---

## Salida de Ejemplo

### 1. **Rutas Definidas**
- **Ruta:** `GET /test`
  - **Respuesta:** `{ "message": "Hola Mundo!" }`

- **Ruta:** `GET /users/123`
  - **Respuesta:** `{ "userId": "123" }`

- **Ruta:** `POST /unknown`
  - **Respuesta:** `"Recurso no encontrado"`

---

## Ventajas

- **Simplifica el Enrutamiento:** Mapea automáticamente controladores a rutas.
- **Soporta Comodines:** Enrutamiento flexible con `'*'` para métodos y rutas.
- **Resiliencia ante Errores:** Maneja adecuadamente rutas no coincidentes y excepciones.
- **Integración con Middlewares:** Permite lógica en capas para solicitudes.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

