# Documentación de la Clase RedisClient

La clase `RedisClient` en S42-Core proporciona una forma robusta y flexible de interactuar con Redis. Implementa un patrón Singleton y gestiona múltiples conexiones a Redis para operaciones generales, publicación y suscripción. Esta clase garantiza estabilidad mediante un mecanismo de reintentos y ofrece una API simple para tareas comunes en Redis.

---

## Características

- **Patrón Singleton:** Garantiza una única instancia del cliente Redis en toda la aplicación.
- **Múltiples Conexiones:** Conexiones dedicadas para comandos generales, publicación y suscripción.
- **Mecanismo de Reintentos:** Reintenta automáticamente las conexiones a Redis en caso de fallos.
- **Interfaz Tipada:** Asegura operaciones predecibles y seguras en términos de tipos.
- **Manejo de Errores Incorporado:** Proporciona mensajes de error informativos para facilitar la solución de problemas.

---

## Instalación

Instala el paquete `s42-core` :

```bash
bun add s42-core
```

---

## Ejemplo de Uso

### Configuración Básica

```typescript
import { RedisClient } from 's42-core';

const connectionURI = 'redis://localhost:6379';
const redisClient = RedisClient.getInstance(connectionURI);

// Realizar operaciones
(async () => {
  await redisClient.hset('user:1', { name: 'John Doe', age: '30' });
  const userName = await redisClient.hget('user:1', 'name');
  console.log('Nombre del Usuario:', userName);
})();
```

### Publicar y Suscribirse

```typescript
const redisClient = RedisClient.getInstance();

// Suscribirse a un canal
redisClient.subscribe('notifications', (message) => {
  console.log('Mensaje recibido:', message);
});

// Publicar un mensaje en el canal
redisClient.publish('notifications', { type: 'alerta', content: 'Este es un mensaje de prueba' });
```

### Cierre Ordenado

```typescript
process.on('SIGINT', () => {
  redisClient.close();
  process.exit(0);
});
```

---

## Documentación de la API

### Métodos

#### `getInstance(connectionURI: string = 'localhost'): RedisClient`

Devuelve la instancia Singleton de `RedisClient`.

- **Parámetros:**
  - `connectionURI` *(string)*: URI de conexión a Redis. Por defecto, es `localhost`.
- **Retorna:**
  - *(RedisClient)*: La instancia Singleton.

#### `hset(key: string, value: Record<string, any>): Promise<void>`

Establece un campo hash en Redis.

- **Parámetros:**
  - `key` *(string)*: La clave del hash.
  - `value` *(Record<string, any>)*: Los datos a establecer.

#### `hget(key: string, subkey: string): Promise<string | null>`

Obtiene un valor de un campo hash.

- **Parámetros:**
  - `key` *(string)*: La clave del hash.
  - `subkey` *(string)*: El campo a recuperar.
- **Retorna:**
  - *(string | null)*: El valor del campo o `null` si no se encuentra.

#### `hgetall(key: string): Promise<Record<string, string>>`

Obtiene todos los campos y valores de un hash.

- **Parámetros:**
  - `key` *(string)*: La clave del hash.
- **Retorna:**
  - *(Record<string, string>)*: Todos los campos y valores.

#### `subscribe<T>(channelName: string, callback: (payload: T) => void): void`

Se suscribe a un canal de Redis.

- **Parámetros:**
  - `channelName` *(string)*: El nombre del canal al que suscribirse.
  - `callback` *(function)*: Función de callback invocada con el mensaje recibido.

#### `publish(channelName: string, payload: Record<string, any>): Promise<void>`

Publica un mensaje en un canal de Redis.

- **Parámetros:**
  - `channelName` *(string)*: El nombre del canal al que publicar.
  - `payload` *(Record<string, any>)*: El contenido del mensaje.

#### `unsubscribe(channelName: string): void`

Se desuscribe de un canal de Redis.

- **Parámetros:**
  - `channelName` *(string)*: El nombre del canal del que desuscribirse.

#### `close(): void`

Cierra todas las conexiones de Redis.

---

## Manejo de Errores

La clase `RedisClient` proporciona mecanismos de manejo de errores robustos. Si una conexión u operación falla, se registran mensajes de error informativos para facilitar la depuración.

### Mecanismo de Reintentos

Cada conexión intenta reconectarse hasta 3 veces antes de lanzar un error. Esto asegura una mayor resistencia en condiciones de red inestables.

---

## Licencia

Este proyecto está licenciado bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

