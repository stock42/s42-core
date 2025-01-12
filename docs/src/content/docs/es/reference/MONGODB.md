---
title: S42-Core MongoDB Clase
description: Accede a una base de datos MongoDB de manera sencilla y eficiente en tus aplicaciones.
---

- [Documentación de la Clase MongoClient](#documentación-de-la-clase-mongoclient)
	- [Características](#características)
	- [Instalación](#instalación)
	- [Ejemplo de Uso](#ejemplo-de-uso)
		- [Configuración Básica](#configuración-básica)
		- [Ejemplo de Paginación](#ejemplo-de-paginación)
	- [Documentación de la API](#documentación-de-la-api)
		- [Constructor](#constructor)
			- [`MongoClient.getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient`](#mongoclientgetinstanceconnection-typemongodbdatabaseconnection-mongoclient)
		- [Métodos](#métodos)
			- [`connect(): Promise<void>`](#connect-promisevoid)
			- [`close(): Promise<void>`](#close-promisevoid)
			- [`getDB(): Db`](#getdb-db)
			- [`getCollection<T>(colName: string): Collection<T>`](#getcollectiontcolname-string-collectiont)
			- [`ObjectId(id: string): ObjectId`](#objectidid-string-objectid)
			- [`paginate<T>(collection: Collection, query: object = {}, fields: object = {}, options: TypeMongoQueryPagination = {}): Promise<{ docs: T[]; count: number; limit: number; page: number; totalPages: number }>`](#paginatetcollection-collection-query-object---fields-object---options-typemongoquerypagination---promise-docs-t-count-number-limit-number-page-number-totalpages-number-)
	- [Manejo de Errores](#manejo-de-errores)
		- [Errores de Conexión](#errores-de-conexión)
		- [Errores de Paginación](#errores-de-paginación)
	- [Licencia](#licencia)


# Documentación de la Clase MongoClient

La clase `MongoClient` es una utilidad para gestionar conexiones con MongoDB en aplicaciones Node.js. Implementa un patrón Singleton para asegurar una única conexión a la base de datos en toda la aplicación y proporciona métodos auxiliares para operaciones comunes con MongoDB.

---

## Características

- **Patrón Singleton:** Asegura una única instancia del cliente MongoDB.
- **Conexión Configurable:** Soporta variables de entorno y configuración explícita para cadenas de conexión y nombres de bases de datos.
- **Acceso a Base de Datos y Colecciones:** Proporciona métodos auxiliares para acceder a la base de datos y sus colecciones.
- **Soporte para Paginación:** Incluye una utilidad para consultas paginadas.
- **Manejo de Errores:** Registra y gestiona errores de conexión y cierre de forma eficiente.

---

## Instalación

Instala el paquete `s42-core` necesario para la clase `MongoClient`:

```bash
npm install s42-core
```

---

## Ejemplo de Uso

### Configuración Básica

```typescript
import { MongoClient } from 's42-core';

const mongoClient = MongoClient.getInstance({
  connectionString: 'mongodb://localhost:27017',
  database: 'miBaseDeDatos',
});

(async () => {
  await mongoClient.connect();

  const db = mongoClient.getDB();
  console.log('Conectado a la base de datos:', db.databaseName);

  const usersCollection = mongoClient.getCollection('usuarios');
  const users = await usersCollection.find().toArray();
  console.log('Usuarios:', users);

  await mongoClient.close();
})();
```

### Ejemplo de Paginación

```typescript
const usersCollection = mongoClient.getCollection('usuarios');
const result = await MongoClient.paginate(usersCollection, { edad: { $gt: 18 } }, {}, {
  page: 2,
  limit: 5,
  sort: { nombre: 1 },
});

console.log('Usuarios Paginados:', result.docs);
console.log('Metadatos:', {
  count: result.count,
  limit: result.limit,
  page: result.page,
  totalPages: result.totalPages,
});
```

---

## Documentación de la API

### Constructor

#### `MongoClient.getInstance(connection: TypeMongoDBdatabaseConnection): MongoClient`

Devuelve la instancia Singleton de la clase MongoClient.

- **Parámetros:**
  - `connection.connectionString` *(string)*: La URI de conexión a MongoDB.
  - `connection.database` *(string)*: El nombre de la base de datos.
- **Retorna:**
  - *(MongoClient)*: La instancia Singleton.

### Métodos

#### `connect(): Promise<void>`

Establece una conexión con MongoDB.

- **Lanza:**
  - Un error si la conexión falla.

#### `close(): Promise<void>`

Cierra la conexión con MongoDB.

#### `getDB(): Db`

Recupera la instancia de la base de datos.

- **Lanza:**
  - Un error si la conexión no ha sido establecida.

#### `getCollection<T>(colName: string): Collection<T>`

Obtiene una colección de la base de datos conectada.

- **Parámetros:**
  - `colName` *(string)*: El nombre de la colección.
- **Retorna:**
  - *(Collection<T>)*: La instancia de la colección.

#### `ObjectId(id: string): ObjectId`

Crea un ObjectId de MongoDB.

- **Parámetros:**
  - `id` *(string)*: La representación en cadena del ObjectId.
- **Lanza:**
  - Un error si el `id` no es válido.

#### `paginate<T>(collection: Collection, query: object = {}, fields: object = {}, options: TypeMongoQueryPagination = {}): Promise<{ docs: T[]; count: number; limit: number; page: number; totalPages: number }>`

Realiza una consulta paginada en una colección.

- **Parámetros:**
  - `collection` *(Collection<T>)*: La colección de MongoDB.
  - `query` *(object, opcional)*: La consulta de filtro.
  - `fields` *(object, opcional)*: Campos para incluir o excluir.
  - `options` *(TypeMongoQueryPagination, opcional)*: Opciones de paginación, que incluyen:
    - `opts` *(object, opcional)*: Opciones adicionales para la consulta.
    - `page` *(number, opcional)*: El número de página actual (por defecto: 1).
    - `limit` *(number, opcional)*: El número de documentos por página (por defecto: 30).
    - `sort` *(object, opcional)*: Criterios de ordenamiento (por defecto: `{ added: -1 }`).
- **Retorna:**
  - *(object)*: Un objeto que contiene:
    - `docs` *(T[])*: Los documentos paginados.
    - `count` *(number)*: El total de documentos que coinciden con la consulta.
    - `limit` *(number)*: El número de documentos por página.
    - `page` *(number)*: El número de página actual.
    - `totalPages` *(number)*: El número total de páginas.

---

## Manejo de Errores

### Errores de Conexión

El método `connect` registra y lanza errores si la conexión falla. Asegúrate de manejar excepciones en tu código para evitar bloqueos.

### Errores de Paginación

El método `paginate` valida los parámetros `page` y `limit` para asegurar que sean enteros positivos. Si se proporcionan valores inválidos, se lanza un error.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

