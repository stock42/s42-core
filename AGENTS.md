# AGENTS.md

## Prioridad
Este proyecto pertenece a **Stock42** o **RastreaSalud** y tiene prioridad alta de análisis y entendimiento.

## Descripción
`s42-core` es un framework backend orientado a microservicios/células sobre Bun.js.
Su objetivo es ofrecer una base común para construir APIs y servicios con:
- servidor HTTP y ruteo por controladores,
- eventos de dominio desacoplados (Redis o SQS),
- utilidades de persistencia (MongoDB, Redis, SQL/SQLite),
- carga dinámica de módulos por convención.

## Stack
- Runtime principal: **Bun** (APIs usadas: `Bun.serve`, `Bun.spawn`, `Bun.Glob`, `Bun.sleep`, `Bun.randomUUIDv7`, `Bun.RedisClient`, `Bun.SQL`, `bun:sqlite`)
- Lenguaje: **TypeScript** (ESM, `moduleResolution: bundler`, `strict`)
- HTTP: Web Standard `Request/Response` + capa propia (`Server`, `RouteControllers`, `Controller`, `Res`)
- Eventos: `EventsDomain` con adaptadores Redis y SQS (`@aws-sdk/client-sqs`)
- Persistencia:
  - SQL multi-motor (`postgres`, `mysql`, `sqlite`) sobre `Bun.SQL` y `bun:sqlite`
  - MongoDB (`mongodb`)
  - Redis/Valkey (`Bun.RedisClient`)
- Validación de contratos de módulos: `zod`

## Notas
- 2026-03-03: Revisé el estado del repo y hay cambios locales pendientes (ver git status). Agregué registro aquí.
- `src/index.ts` exporta la API pública del framework. Cualquier cambio aquí impacta DX y semver.
- Mapa funcional de `src/`:
  - `Server/`: bootstrap HTTP y soporte de cluster IPC.
  - `RouteControllers/`: matching de rutas, parseo de request, hooks before/after.
  - `Controller/`: definición de endpoints y cadena de middlewares.
  - `Response/`: helper `Res` para construir respuestas.
  - `SSE/`: stream SSE con `ReadableStream` tipo `direct`.
  - `Cluster/`: orquestación de workers Bun por `spawn` + canal IPC.
  - `EventsDomain/`: registro de emisores/listeners y entrega entre instancias/clusters.
  - `Modules/`: autodescubrimiento y carga dinámica de `__module__.ts`, controllers y eventos.
  - `SQL/` y `SQLite/`: abstracción de consultas y utilidades de esquema.
  - `MongoDB/` y `MongoDBStorage/`: acceso y storage helpers.
  - `RedisDB/`: cliente Redis con cache/hash/pubsub.
  - `Dependencies/`: contenedor DI estático.
  - `Mailgun/`, `ViewTemplates/`, `Test/`: utilidades complementarias.
- Convención de eventos en `EventsDomain`: `A.B.C` en mayúsculas; módulo inferido desde el primer segmento.
- Estado actual: el backlog de mejoras y deuda técnica vive en `STATUS.md` (priorizado por criticidad 1–5).
- Criterio de contribución: mantener enfoque **Bun-first** (usar APIs nativas de Bun antes que `node:*` o librerías extra cuando sea viable).


# Importante
En cada cambio, mantener actulizada la documentación en ./DOCUMENTATION
Darle prioridad a DOCUMENTATION/ALL_EN.md

Mantener actualizado el website de s42-core ./docs

Luego de cada cambio, crear un commit con la descripción.

