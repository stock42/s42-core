# STATUS — s42-core

> Análisis del estado del proyecto y backlog de mejoras priorizado.
> Fecha: 2026-05-27 · Versión analizada: `3.0.6` · Runtime: Bun ≥ 1.3.0

---

## 1. Descripción del proyecto

**s42-core** es un framework backend **Bun-first** orientado a microservicios/células,
escrito en **TypeScript** (ESM, `strict`). Su objetivo es ofrecer una base común para
construir APIs y servicios con bajo acoplamiento.

Bloques funcionales (`src/`):

| Módulo | Responsabilidad |
|---|---|
| `Server/` | Bootstrap HTTP sobre `Bun.serve` + canal IPC para cluster |
| `RouteControllers/` | Matching de rutas, parseo de request, hooks before/after |
| `Controller/` | Definición de endpoints y cadena de middlewares |
| `Response/` (`Res`) | Helper para construir `Response` |
| `SSE/` | Stream Server-Sent Events con `ReadableStream` tipo `direct` |
| `Cluster/` | Orquestación de workers Bun vía `spawn` + IPC |
| `EventsDomain/` | Eventos de dominio con adaptadores Redis y SQS |
| `Modules/` | Autodescubrimiento y carga dinámica de `__module__.ts` |
| `SQL/` y `SQLite/` | Abstracción de consultas multi-motor (postgres/mysql/sqlite) |
| `MongoDB/` y `MongoDBStorage/` | Acceso y helpers de storage |
| `RedisDB/` | Cliente Redis con cache/hash/pubsub |
| `Dependencies/` | Contenedor DI estático |
| `CoreStats/` | Endpoint de métricas del sistema |
| `Mailgun/`, `ViewTemplates/`, `Test/` | Utilidades complementarias |

### Estado actual (verificado)

- ✅ `bun run typecheck` (`tsc --noEmit`): **pasa sin errores**.
- ✅ `bun test`: **6 tests, 0 fallos** (3 archivos: `Controller`, `CoreStats`, `Modules`).
- ❌ `bun run lint`: **roto** — ESLint 9 no lee el `.eslintrc.cjs` heredado.
- ⚠️ ~5.000 LOC en `src/`, ~30 archivos fuente; **cobertura de tests muy baja**.

---

## 2. Resumen de mejoras por criticidad

`1` = máxima prioridad (atender primero) · `5` = menor prioridad.

| # | Mejora | Crit. | Área | Estado |
|---|---|:---:|---|---|
| 1 | Inyección SQL por identificadores sin validar (`SQL`) | **1** | Seguridad | ✅ Hecho (validate-only) |
| 2 | Binding de parámetros frágil con `split('?')` (Postgres/MySQL) | **1** | Seguridad / Datos | Pendiente |
| 3 | Identificadores sin validar en `SQLite` (columnas/sort/índices) | **2** | Seguridad | ✅ Hecho |
| 4 | CORS abierto y hardcodeado, no configurable | **2** | Seguridad |
| 5 | Valores de retorno de `insert/update/delete` poco fiables | **2** | Robustez | ✅ Hecho |
| 6 | `EventsDomain` sin expiración de instancias muertas | **2** | Fiabilidad | ✅ Hecho |
| 7 | `bun run lint` roto (ESLint 9 vs `.eslintrc.cjs`) | **3** | Tooling | ✅ Hecho |
| 8 | Cobertura de tests muy baja | **3** | Calidad |
| 9 | Sin abstracción de logging (55 `console.*`) | **3** | Operación | ✅ Hecho |
| 10 | Uso extendido de `any` que mina el `strict` | **3** | Tipado |
| 11 | Lógica `translateMongoJsonToSql` duplicada | **3** | Mantenibilidad | ✅ Hecho |
| 12 | After-hooks no pueden alterar la respuesta ya emitida | **3** | Diseño |
| 13 | Falta archivo `LICENSE` (declarado MIT y en `files`) | **4** | Publicación | ✅ Hecho |
| 14 | Dependencia `jsonwebtoken` sin usar | **4** | Dependencias | ✅ Hecho |
| 15 | CHANGELOG/ROADMAP desactualizados; `TODO.md` inexistente | **4** | Documentación |
| 16 | Singletons ignoran config tras la 1ª inicialización | **4** | Diseño |
| 17 | Parseo de query params naïve (`split('=')`) | **4** | Correctitud | ✅ Hecho |
| 18 | `SSE`: código muerto y busy-wait de flush | **5** | Limpieza | ✅ Hecho (parcial) |
| 19 | Helpers de path hechos a mano en `Modules` | **5** | Limpieza |
| 20 | Duplicación de documentación (alto coste de mantenimiento) | **5** | Documentación |
| 21 | CLI de scaffolding de proyectos (roadmap) | **5** | Feature |

---

## 3. Detalle por criticidad

### 🔴 Criticidad 1 — Atender de inmediato (seguridad / integridad de datos)

#### 1. Inyección SQL por identificadores sin validar en `SQL` — ✅ RESUELTO (validate-only)
> **Estado:** resuelto. Validación centralizada en `src/SQL/identifiers.ts`
> (`assertValidIdentifier` / `assertValidColumns` / `assertValidSortKeys`) y aplicada en
> `SQL` y `SQLite`. `translateMongoJsonToSql` se deduplicó y ahora valida los campos del
> `WHERE`. `getTableSchema` (Postgres) parametriza el nombre de tabla. Tests:
> `src/SQL/identifiers.test.ts`, `src/SQL/index.test.ts`.
> **Compatibilidad:** *validate-only* — para identificadores ya válidos el SQL generado es
> byte-idéntico; solo se rompe a quien pasaba expresiones/alias crudos en `columns`
> (p. ej. `COUNT(*) AS total`) → corresponde bump de versión (minor documentado / major estricto).

**Archivo:** `src/SQL/index.ts`
La clase multi-motor `SQL` **no valida ningún identificador**. Se concatenan
directamente en la cadena de la consulta:
- Nombres de tabla en `createTable`, `insert`, `select`, `count`, `delete`, `update`,
  `dropTable`, `addTableColumns`, `createIndex` (ej. `INSERT INTO ${tableName} ...`, línea 138).
- Nombres de columna (`keys.join(', ')` en `insert`, `columns.join(', ')` en `select`).
- Claves y direcciones de `ORDER BY` derivadas de `sort` (líneas 425-431).
- Campos del `WHERE` en `translateMongoJsonToSql` (`${field} ${sqlOperator} ?`, línea 42).
- `getTableSchema` (Postgres) interpola el nombre como literal: `WHERE table_name = '${tableName}'` (línea 246).

Los **valores** sí se parametrizan con `?`, pero los **identificadores no**. Si cualquiera
de estos proviene de entrada externa (nombre de columna, `sort`, claves del filtro), hay
un vector de inyección SQL directo.
**Recomendación:** validar identificadores con una whitelist/regex (`^[A-Za-z0-9_]+$`) y/o
comillar con el quoting del motor; centralizar en un helper `quoteIdentifier(type, name)`.

#### 2. Binding de parámetros frágil con `split('?')` (Postgres/MySQL)
**Archivo:** `src/SQL/index.ts:99-110`
Para Postgres/MySQL se simula el template tag de Bun partiendo la query por `?`. El propio
código admite que **falla si hay un `?` dentro de un literal de cadena**. Esto puede
desalinear parámetros silenciosamente → datos corruptos o inyección.
**Recomendación:** construir el array `strings`/`values` correctamente desde el origen
(no por split del SQL ya armado), o usar el API de Bun SQL con placeholders nativos.

---

### 🟠 Criticidad 2 — Alta prioridad (robustez / seguridad)

#### 3. Identificadores sin validar en `SQLite`
**Archivo:** `src/SQLite/index.ts`
`tableMatch()` (línea 113) valida el **nombre de tabla**, pero **no** los nombres de
columna en `insert`/`update`, ni el array `columns` o las claves de `sort` en `select`
(líneas 196-202, 237-239, 279-286), ni `columnName` en `createIndex` (línea 211).
**Recomendación:** aplicar la misma validación de identificadores a columnas, sort e índices.

#### 4. CORS abierto y hardcodeado
**Archivo:** `src/RouteControllers/index.ts:153-167`
`setHeaders()` fija `Access-Control-Allow-Origin: *` junto con
`Access-Control-Allow-Credentials: true`, sin posibilidad de configurar orígenes
permitidos. Es un *default* inseguro (además, navegadores rechazan esa combinación).
**Recomendación:** hacer CORS configurable (lista de orígenes, métodos, credenciales) vía
opciones del `Server`/`RouteControllers`; default restrictivo.

#### 5. Valores de retorno de `insert/update/delete` poco fiables — ✅ RESUELTO
> **Estado:** resuelto. La normalización de resultados se centralizó en `src/SQL/results.ts`
> (`extractAffectedRows` / `extractLastInsertId`), con precedencia determinista por forma de
> resultado (sqlite/postgres/mysql) y tests por shape en `src/SQL/results.test.ts`. Se
> eliminaron los `as any` y suposiciones de `insert`/`update`/`delete`.

**Archivo:** `src/SQL/index.ts:155-180, 307-317, 357-362`
El mapeo de `lastInsertRowId`/`changes`/`affectedRows`/`rowCount` se hace con `as any` y
suposiciones ("we can't easily know the PK", "let's assume standard behavior"). Puede
devolver `undefined` según el driver.
**Recomendación:** normalizar el resultado por motor con tipos concretos y tests por driver.

#### 6. `EventsDomain` sin expiración de instancias muertas — ✅ RESUELTO
> **Estado:** resuelto. Cada instancia guarda `lastSeen` (refrescado por el heartbeat de 5s);
> `evictStaleInstances` purga las que superan 3 heartbeats (15s) y re-selecciona `firstListener`.
> La instancia local nunca se elimina. Tests: `src/EventsDomain/index.test.ts`.

**Archivo:** `src/EventsDomain/index.ts:220-245, 337-355`
El *heartbeat* reanuncia listeners/emitters cada 5 s, pero no hay TTL: si una instancia
muere sin enviar `removeInstance` (crash), queda registrada y los eventos en modo
single-listener pueden enrutarse a un `firstListener` muerto → eventos perdidos.
**Recomendación:** registrar `lastSeen` por instancia y purgar las que superen un TTL
(ej. 3× el intervalo de heartbeat).

---

### 🟡 Criticidad 3 — Mantenibilidad y tooling

#### 7. `bun run lint` está roto — ✅ RESUELTO
> **Estado:** resuelto. Migrado a flat config `eslint.config.js` (ESLint 9); se eliminó
> `.eslintrc.cjs`. Se corrigieron todos los hallazgos (formato prettier, vars muertas,
> try/catch inútiles, alias de `this` en SSE). `bun run lint` ahora pasa limpio.

**Archivos:** `package.json:47`, `.eslintrc.cjs`
ESLint 9.39.4 ya no lee `.eslintrc.cjs` por defecto; el comando falla con
"couldn't find an eslint.config file". El lint del proyecto no se ejecuta.
**Recomendación:** migrar a `eslint.config.js` (flat config) o fijar
`ESLINT_USE_FLAT_CONFIG=false`.

#### 8. Cobertura de tests muy baja
Solo hay tests para `Controller`, `CoreStats` y `Modules` (6 tests). **Sin tests** para
`SQL`, `SQLite`, `EventsDomain`, `RouteControllers`, `RedisDB`, `Cluster`, `SSE`,
`MongoDB(Storage)` — justamente las rutas de datos, ruteo y eventos.
**Recomendación:** priorizar tests de `SQL`/`SQLite` (incl. casos de inyección), matching
de rutas y enrutado de eventos.

#### 9. Sin abstracción de logging — ✅ RESUELTO
> **Estado:** resuelto. Nuevo `logger` con niveles en `src/Logger/index.ts` (exportado en la API
> pública). Reemplaza los `console.*` de runtime (excepto el reporter `Test/`). Default `debug`
> (todo activado → sin cambio de comportamiento); nivel vía `S42_LOG_LEVEL`/`LOG_LEVEL` o
> `setLogLevel(...)`; sink reemplazable con `setLogSink(...)`. Docs: `DOCUMENTATION/LOGGER.md`.
> Tests: `src/Logger/index.test.ts`.

#### 9bis. Detalle original
55 llamadas `console.*` repartidas por `src/`. La carga de módulos imprime siempre, sin
niveles ni forma de silenciar en producción.
**Recomendación:** introducir un logger inyectable con niveles (debug/info/warn/error).

#### 10. Uso extendido de `any`
`SQL.dbInstance: any`, múltiples `as any` en resultados de queries, `result[0].total`,
casts en `Server.start`. Debilita el valor de `strict`.
**Recomendación:** tipar resultados por motor; eliminar `as any` donde sea posible.

#### 11. `translateMongoJsonToSql` duplicada — ✅ RESUELTO
> **Estado:** resuelto en el punto 1. Definición única en `src/SQL/identifiers.ts`,
> re-exportada por `SQL` y `SQLite`. Tests en `src/SQL/identifiers.test.ts`.

Implementada dos veces, casi idéntica, en `src/SQL/index.ts:12` y `src/SQLite/index.ts:38`.
Riesgo de divergencia (y ambas comparten el problema de identificadores del punto 1).
**Recomendación:** extraer a un único helper compartido y testeado.

#### 12. After-hooks no pueden alterar la respuesta
**Archivo:** `src/RouteControllers/index.ts:352-361`
La respuesta final se obtiene del callback **antes** de ejecutar los after-hooks; estos
mutan un `Res` ya emitido, por lo que sus cambios (headers, etc.) se ignoran.
**Recomendación:** documentar la limitación o permitir que un after-hook reemplace la
respuesta.

---

### 🟢 Criticidad 4 — Higiene del proyecto

#### 13. Falta archivo `LICENSE`
`package.json` declara `"license": "MIT"` y lista `"LICENSE"` en `files`, pero el archivo
no existe → `npm publish` lo omite. **Fix trivial:** añadir `LICENSE` (MIT).

#### 14. Dependencia `jsonwebtoken` sin usar
Declarada en `dependencies` pero sin uso en `src/` (lib CJS en proyecto Bun-first).
**Recomendación:** eliminarla o, si se necesita JWT, usar `Bun`/Web Crypto.

#### 15. Documentación de estado desincronizada
`CHANGELOG.md` se detiene en `2.0.13` (la versión actual es `3.0.6`); `ROADMAP.md` es
mínimo; `AGENTS.md` referencia un `TODO.md` que no existe.
**Recomendación:** actualizar CHANGELOG hasta 3.x y crear/eliminar `TODO.md` según corresponda.

#### 16. Singletons ignoran configuración posterior
`MongoClient`, `RedisClient` y `EventsDomain` (`getInstance(...)`) devuelven la primera
instancia y **descartan silenciosamente** args distintos en llamadas posteriores.
**Recomendación:** avisar/error si se pasa config distinta, o soportar instancias con clave.

#### 17. Parseo de query params naïve — ✅ RESUELTO (sin cambio de comportamiento)
> **Estado:** resuelto. Se corrigió la truncación de valores con `=` usando `indexOf` (primer
> `=`). Se mantuvieron deliberadamente las semánticas de `decodeURIComponent` para no alterar el
> comportamiento actual: `URLSearchParams` puro habría cambiado `+`→espacio y el manejo de `%`
> malformado, por eso no se adoptó. Tests: `src/RouteControllers/index.test.ts`.

**Archivo:** `src/RouteControllers/index.ts:179-189`
`getQueryParams` parte por `=` tomando solo 2 partes (un valor con `=` se trunca) y no
maneja claves repetidas.
**Recomendación:** usar `URL.searchParams`.

---

### 🔵 Criticidad 5 — Pulido / nice-to-have

#### 18. `SSE`: código muerto y busy-wait — ✅ RESUELTO (parcial)
> **Estado:** se eliminó el método muerto `sendSSECustom` y se documentó la cadencia de
> `flush` (1s) como heartbeat/keep-alive. El bucle de flush por segundo se mantiene (es la
> estrategia de keep-alive); si se quisiera optimizar a futuro se podría reemplazar por flush
> dirigido por evento, pero queda fuera de este cambio para no alterar comportamiento.

**Archivo:** `src/SSE/index.ts`
`sendSSECustom` es privado y nunca se usa; el `pull` hace `flush()` + `sleep(1000)` en bucle
sin keep-alive/heartbeat explícito.

#### 19. Helpers de path hechos a mano en `Modules`
**Archivo:** `src/Modules/index.ts:458-518`
`normalizePath`/`joinPath`/`dirname`/`toFileImportURL` reimplementan utilidades de rutas a
mano (frágil ante casos borde).
**Recomendación:** usar `node:path` + `Bun.pathToFileURL`/`URL` y reducir superficie.

#### 20. Duplicación de documentación
`DOCUMENTATION/` (en+es), `docs/content/` (en+es) y los `README` mantienen contenido
paralelo; `AGENTS.md` obliga a actualizar todo en cada cambio → alto coste de mantenimiento
y riesgo de divergencia.
**Recomendación:** definir una única fuente de verdad y generar el resto.

#### 21. CLI de scaffolding (roadmap)
Pendiente en `ROADMAP.md` ("CLI Auto generación de proyecto"). Mejoraría notablemente el
onboarding/DX.

---

## 4. Plan sugerido (orden de ataque)

1. **Sprint seguridad (Crit. 1-2):** validar identificadores en `SQL`/`SQLite`, arreglar el
   binding de parámetros, hacer CORS configurable, normalizar retornos de escritura y añadir
   TTL de instancias en `EventsDomain`. Acompañar con tests de regresión.
2. **Sprint calidad (Crit. 3):** arreglar el lint, subir cobertura en las rutas críticas,
   logger inyectable, deduplicar `translateMongoJsonToSql` y reducir `any`.
3. **Sprint hygiene (Crit. 4):** `LICENSE`, limpiar dependencias, sincronizar CHANGELOG/ROADMAP.
4. **Sprint pulido (Crit. 5):** SSE, helpers de path, consolidación de docs, CLI.
