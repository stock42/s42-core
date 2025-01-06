---
title: S42-Core Dependencies Clase
description: Utiliza dependencias de manera centralizada y controlada en tus aplicaciones.
---
- [Documentación de la Clase Dependencies](#documentación-de-la-clase-dependencies)
	- [Características](#características)
	- [Documentación de la API](#documentación-de-la-api)
		- [Métodos](#métodos)
			- [`add<DEP>(name: string, dep: DEP): void`](#adddepname-string-dep-dep-void)
			- [`get<DEP>(name: string): DEP | null`](#getdepname-string-dep--null)
			- [`remove(name: string): boolean`](#removename-string-boolean)
			- [`clear(): void`](#clear-void)
			- [`has(name: string): boolean`](#hasname-string-boolean)
	- [Ejemplo de Uso](#ejemplo-de-uso)
		- [Registrar y Obtener Dependencias](#registrar-y-obtener-dependencias)
		- [Eliminar y Limpiar Dependencias](#eliminar-y-limpiar-dependencias)
	- [Casos de Uso](#casos-de-uso)
	- [Manejo de Errores](#manejo-de-errores)
	- [Licencia](#licencia)


# Documentación de la Clase Dependencies

La clase `Dependencies` es una utilidad diseñada para gestionar dependencias de manera centralizada y controlada. Permite registrar, obtener y eliminar dependencias por nombre, lo que la hace ideal para aplicaciones modulares.

---

## Características

- **Gestión Centralizada de Dependencias:** Registra y recupera dependencias de forma global.
- **Seguridad de Tipos:** Soporte para genéricos de TypeScript, garantizando seguridad en el manejo de tipos.
- **Manejo de Errores:** Previene el registro duplicado de dependencias.

---

## Documentación de la API

### Métodos

#### `add<DEP>(name: string, dep: DEP): void`

Registra una nueva dependencia con un nombre único.

- **Parámetros:**
  - `name` *(string)*: El nombre único de la dependencia.
  - `dep` *(any)*: La instancia u objeto de la dependencia a registrar.
- **Errores:**
  - Lanza un error si ya existe una dependencia con el mismo nombre.

#### `get<DEP>(name: string): DEP | null`

Obtiene una dependencia registrada por su nombre.

- **Parámetros:**
  - `name` *(string)*: El nombre de la dependencia a buscar.
- **Retorna:**
  - La instancia de la dependencia si existe, o `null` si no está registrada.

#### `remove(name: string): boolean`

Elimina una dependencia registrada por su nombre.

- **Parámetros:**
  - `name` *(string)*: El nombre de la dependencia a eliminar.
- **Retorna:**
  - `true` si la dependencia fue eliminada con éxito, `false` si no existía.

#### `clear(): void`

Elimina todas las dependencias registradas.

#### `has(name: string): boolean`

Verifica si existe una dependencia registrada con un nombre específico.

- **Parámetros:**
  - `name` *(string)*: El nombre de la dependencia.
- **Retorna:**
  - `true` si la dependencia está registrada, `false` si no.

---

## Ejemplo de Uso

### Registrar y Obtener Dependencias

```typescript
import { Dependencies } from 's42-core';

// Registrar una dependencia
Dependencies.add('database', { connectionString: 'mongodb://localhost:27017' });

// Verificar si la dependencia existe
if (Dependencies.has('database')) {
  console.log('La dependencia de la base de datos está registrada.');
}

// Obtener la dependencia
const dbConfig = Dependencies.get<{ connectionString: string }>('database');
console.log('Connection String:', dbConfig?.connectionString);
```

### Eliminar y Limpiar Dependencias

```typescript
// Eliminar una dependencia específica
Dependencies.remove('database');

// Limpiar todas las dependencias
Dependencies.clear();
```

---

## Casos de Uso

- **Gestión de Servicios:** Almacenar servicios compartidos como instancias de bases de datos, clientes HTTP o configuraciones.
- **Inyección de Dependencias:** Simplificar la inyección de dependencias en diferentes partes de la aplicación.
- **Pruebas Unitarias:** Simular dependencias para escenarios de pruebas aisladas.

---

## Manejo de Errores

El método `add` lanzará un error si intentas registrar una dependencia con un nombre que ya existe. Asegúrate de que los nombres sean únicos dentro de tu aplicación:

```typescript
try {
  Dependencies.add('database', {});
  Dependencies.add('database', {}); // Lanza un error
} catch (error) {
  console.error(error.message);
}
```

---

## Licencia

Este proyecto está licenciado bajo la licencia MIT. Consulta el archivo LICENSE para más detalles.

