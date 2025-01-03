- [Documentación de la Clase SQLite](#documentación-de-la-clase-sqlite)
	- [Características Clave](#características-clave)
	- [Instalación](#instalación)
	- [Ejemplos de Uso](#ejemplos-de-uso)
		- [Inicialización](#inicialización)
		- [Creación y Gestión de Tablas](#creación-y-gestión-de-tablas)
			- [Crear una Tabla](#crear-una-tabla)
			- [Eliminar una Tabla](#eliminar-una-tabla)
			- [Agregar Columnas a una Tabla Existente](#agregar-columnas-a-una-tabla-existente)
		- [Operaciones CRUD](#operaciones-crud)
			- [Insertar Datos](#insertar-datos)
			- [Consultar Datos](#consultar-datos)
			- [Actualizar Datos](#actualizar-datos)
			- [Eliminar Datos](#eliminar-datos)
		- [Indexación](#indexación)
			- [Crear un Índice](#crear-un-índice)
		- [Acceso a Metadatos](#acceso-a-metadatos)
			- [Obtener Todas las Tablas](#obtener-todas-las-tablas)
			- [Obtener el Esquema de una Tabla](#obtener-el-esquema-de-una-tabla)
	- [Ventajas de Usar la Clase SQLite](#ventajas-de-usar-la-clase-sqlite)
	- [Manejo de Errores](#manejo-de-errores)
	- [Licencia](#licencia)


# Documentación de la Clase SQLite

La clase `SQLite` es parte del paquete `s42-core` y proporciona una interfaz completa y eficiente para interactuar con bases de datos SQLite. Admite operaciones comunes como crear, actualizar, consultar y eliminar datos, así como funciones avanzadas como administración de esquemas, indexación y traducción de consultas al estilo MongoDB.

## Características Clave

- **Flexibilidad:** Soporte para bases de datos SQLite en memoria y basadas en archivos.
- **Operaciones CRUD:** Métodos simplificados para operaciones `INSERT`, `SELECT`, `UPDATE` y `DELETE`.
- **Gestión de Esquemas:** Crear, eliminar y modificar tablas dinámicamente.
- **Soporte para Paginación:** Opciones integradas de `LIMIT` y `OFFSET` para un manejo eficiente de consultas.
- **Indexación:** Crear índices para optimizar el rendimiento de las consultas.
- **Acceso a Metadatos:** Recuperar una lista de todas las tablas y sus esquemas.
- **Consultas al Estilo MongoDB:** Traducción de consultas tipo MongoDB a SQL para una integración fluida.
- **Manejo de Errores:** Validaciones integradas y mensajes de error descriptivos para garantizar la fiabilidad.

---

## Instalación

Para usar la clase `SQLite`, instala el paquete `s42-core`:

```bash
npm install s42-core
```

---

## Ejemplos de Uso

### Inicialización

```typescript
import { SQLite } from 's42-core';

// Crear una base de datos en memoria
const sqlite = new SQLite({ type: 'memory' });

// Crear una base de datos basada en archivo
const sqliteFile = new SQLite({ type: 'file', filename: 'data.db' });
```

### Creación y Gestión de Tablas

#### Crear una Tabla
```typescript
await sqlite.createTable('users', {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  name: 'TEXT',
  age: 'INTEGER',
});
```

#### Eliminar una Tabla
```typescript
await sqlite.dropTable('users');
```

#### Agregar Columnas a una Tabla Existente
```typescript
await sqlite.addTableColumns('users', {
  email: 'TEXT',
  isActive: 'BOOLEAN',
});
```

### Operaciones CRUD

#### Insertar Datos
```typescript
await sqlite.insert('users', { name: 'John Doe', age: 30 });
```

#### Consultar Datos
```typescript
const users = await sqlite.select('users', ['id', 'name'], { age: { $gte: 18 } }, { name: 1 }, 10, 0);
console.log(users);
```

#### Actualizar Datos
```typescript
await sqlite.update('users', { id: 1 }, { name: 'Jane Doe', age: 28 });
```

#### Eliminar Datos
```typescript
await sqlite.delete('users', { age: { $lt: 18 } });
```

### Indexación

#### Crear un Índice
```typescript
await sqlite.createIndex('users', 'name');
```

### Acceso a Metadatos

#### Obtener Todas las Tablas
```typescript
const tables = await sqlite.getAllTables();
console.log(tables);
```

#### Obtener el Esquema de una Tabla
```typescript
const schema = await sqlite.getTableSchema('users');
console.log(schema);
```

---

## Ventajas de Usar la Clase SQLite

1. **Facilidad de Uso:** Simplifica operaciones complejas de SQLite en una API limpia e intuitiva.
2. **Integración Perfecta:** La traducción de consultas al estilo MongoDB permite una integración fluida con aplicaciones que utilizan esta sintaxis.
3. **Optimización del Rendimiento:** Características como indexación y paginación garantizan un manejo eficiente de los datos.
4. **Gestión Dinámica de Esquemas:** Modifique tablas fácilmente sin necesidad de SQL manual.
5. **Resiliencia a Errores:** Validaciones y mensajes de error detallados ayudan a prevenir y depurar problemas.
6. **Extensibilidad:** Diseñada con flexibilidad para soportar funciones adicionales como transacciones y operaciones por lotes.
7. **Construcción Dinámica de Consultas:** Cree consultas de manera flexible con filtros, ordenamientos y límites.

---

## Manejo de Errores

La clase incluye un manejo robusto de errores:
- Asegura que los nombres de tablas y columnas sean válidos.
- Lanza errores descriptivos cuando las operaciones fallan.
- Registra errores para facilitar la depuración.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

