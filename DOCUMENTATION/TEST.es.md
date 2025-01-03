- [Documentación de la Utilidad Test](#documentación-de-la-utilidad-test)
	- [Propósito](#propósito)
	- [Funciones](#funciones)
		- [1. `Init(message: string): void`](#1-initmessage-string-void)
		- [2. `Ok(message: string): void`](#2-okmessage-string-void)
		- [3. `Error(message: string, error?: Error): void`](#3-errormessage-string-error-error-void)
		- [4. `Request(method: string, url: string): void`](#4-requestmethod-string-url-string-void)
		- [5. `Finish(): void`](#5-finish-void)
	- [Instalación](#instalación)
	- [Ejemplo de Uso](#ejemplo-de-uso)
	- [Ventajas](#ventajas)
	- [Licencia](#licencia)


# Documentación de la Utilidad Test

La utilidad `Test` forma parte del paquete `s42-core` y está diseñada para estandarizar y mejorar los registros en consola durante el desarrollo y las pruebas de aplicaciones. Proporciona un conjunto de funciones predefinidas para mostrar mensajes claros y codificados por colores en la consola, facilitando el seguimiento del progreso y el estado de las operaciones.

## Propósito

El propósito de la utilidad `Test` es simplificar y mejorar la legibilidad de los mensajes en consola. Es especialmente útil para:

- Depurar y probar aplicaciones.
- Proporcionar registros estructurados para operaciones.
- Mostrar el estado de solicitudes HTTP, inicializaciones y manejo de errores de manera consistente.

---

## Funciones

### 1. `Init(message: string): void`
Registra un mensaje de inicialización.

**Ejemplo:**
```typescript
Test.Init("Iniciando el proceso...");
```
**Salida:**
```
INIT> Iniciando el proceso...
```

---

### 2. `Ok(message: string): void`
Registra un mensaje de éxito con un checkmark.

**Ejemplo:**
```typescript
Test.Ok("¡Operación completada con éxito!");
```
**Salida:**
```
✅ OK> ¡Operación completada con éxito!
```

---

### 3. `Error(message: string, error?: Error): void`
Registra un mensaje de error con una pila de errores opcional.

**Ejemplo:**
```typescript
Test.Error("Ocurrió un error.", new Error("Error de ejemplo"));
```
**Salida:**
```
📛 > Ocurrió un error.
Pila del error (si se proporciona)
```

---

### 4. `Request(method: string, url: string): void`
Registra una solicitud HTTP con el método y la URL.

**Ejemplo:**
```typescript
Test.Request("POST", "https://api.example.com/data");
```
**Salida:**
```
+ Request> POST https://api.example.com/data
```

---

### 5. `Finish(): void`
Registra un mensaje indicando que todas las pruebas u operaciones han finalizado.

**Ejemplo:**
```typescript
Test.Finish();
```
**Salida:**
```
😃 > Todas las pruebas han finalizado
```

---

## Instalación

Para usar la utilidad `Test`, instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Ejemplo de Uso

```typescript
import { Test } from 's42-core';

Test.Init("Archivos de almacenamiento");
Test.Ok("¡Operación exitosa!");
Test.Error("Ocurrió un error.", new Error("Error de ejemplo"));
Test.Request("GET", "https://example.com/api");
Test.Finish();
```

**Salida:**
```
INIT> Archivos de almacenamiento
✅ OK> ¡Operación exitosa!
📛 > Ocurrió un error.
Pila del error (si se proporciona)
+ Request> GET https://example.com/api
😃 > Todas las pruebas han finalizado
```

---

## Ventajas

- **Consistencia:** Asegura un formato uniforme de registros en toda la aplicación.
- **Legibilidad:** Utiliza mensajes codificados por colores para una mejor visibilidad.
- **Facilidad de Uso:** Proporciona métodos simples y predefinidos para tipos comunes de registros.
- **Depuración:** Ayuda a identificar rápidamente inicializaciones, éxitos, errores y solicitudes HTTP.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

