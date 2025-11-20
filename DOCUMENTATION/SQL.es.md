# Capa de Abstracción SQL

Esta librería proporciona una interfaz unificada para interactuar con bases de datos **PostgreSQL**, **MySQL** y **SQLite** utilizando [Bun](https://bun.sh/). Abstrae las diferencias subyacentes entre estas bases de datos, permitiéndote escribir código agnóstico a la base de datos.

## Características

- **API Unificada**: Mismos métodos para todas las bases de datos soportadas.
- **Gestión de Esquemas**: Crear tablas, agregar columnas, crear índices.
- **Operaciones CRUD**: Insertar, seleccionar, actualizar, eliminar.
- **Paginación**: Soporte integrado para paginación.
- **Consultas estilo Mongo**: Usa una sintaxis similar a MongoDB para las cláusulas `where`.

## Instalación

Asegúrate de tener Bun instalado.

```bash
bun install
```

## Uso

### Inicialización

Puedes inicializar la clase `SQL` con el tipo de base de datos y los detalles de conexión.

```typescript
import { SQL } from 's42-core'; // Ajusta la ruta de importación según sea necesario

// SQLite
const db = new SQL({ type: 'sqlite', url: 'mydb.sqlite' });

// PostgreSQL
const pg = new SQL({
    type: 'postgres',
    url: 'postgres://user:pass@localhost:5432/mydb'
});

// MySQL
const mysql = new SQL({
    type: 'mysql',
    url: 'mysql://user:pass@localhost:3306/mydb'
});
```

### Creando una Tabla

```typescript
await db.createTable('users', {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT', // Ejemplo de sintaxis SQLite
    // Para Postgres: id: 'SERIAL PRIMARY KEY'
    name: 'TEXT',
    email: 'TEXT',
    age: 'INTEGER'
});
```

### Insertando Datos

```typescript
const result = await db.insert('users', {
    name: 'Juan Perez',
    email: 'juan@example.com',
    age: 30
});

console.log(result.lastInsertRowId); // ID del nuevo usuario
```

### Seleccionando Datos

Puedes usar sintaxis de objetos para los argumentos en `select` y `selectPaginate`.

```typescript
// Selección Simple
const users = await db.select<User>({
    tableName: 'users',
    columns: ['id', 'name'],
    whereClause: { age: { $gte: 18 } }
});

// Paginación
const page = await db.selectPaginate<User>({
    tableName: 'users',
    page: 1,
    limit: 10,
    whereClause: { name: { $like: 'J%' } },
    sort: { name: 1 } // 1 para ASC, -1 para DESC
});

console.log(page.data);
console.log(page.total);
```

### Actualizando Datos

```typescript
await db.update({
    tableName: 'users',
    whereClause: { id: 1 },
    data: { age: 31 }
});

// O por ID directamente
await db.updateById('users', 1, { age: 32 });
```

### Eliminando Datos

```typescript
await db.delete('users', { email: 'juan@example.com' });

// O por ID directamente
await db.deleteById('users', 1);
```

## Sintaxis de Consulta

La `whereClause` soporta un subconjunto de operadores de consulta de MongoDB:

- `$eq`: Igual a
- `$gt`: Mayor que
- `$gte`: Mayor o igual que
- `$lt`: Menor que
- `$lte`: Menor o igual que
- `$ne`: No igual a
- `$in`: En arreglo
- `$nin`: No en arreglo
- `$like`: Operador LIKE de SQL

Ejemplo:

```typescript
const where = {
    age: { $gte: 18, $lte: 65 },
    status: { $in: ['active', 'pending'] },
    name: { $like: '%Smith%' }
};
```
