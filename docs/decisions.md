# Decisiones de diseño del proyecto Mallatex MES

> Registro ligero de decisiones arquitectónicas (ADR). Cada decisión
> importante se agrega aquí con fecha, contexto, decisión y por qué.
> Ayuda al futuro yo (y a Claude Code) a no repetir debates que ya se
> dieron.

---

## 2026-05 · ADR-001: Stack Next.js + React + estilos inline

**Contexto:** Hay que elegir framework para el MES. Opciones consideradas:
Next.js, Vite + React, Remix, Astro.

**Decisión:** Next.js 14+ con App Router.

**Por qué:**

- API Routes integradas para conexión futura con SAE de Aspel
- File-based routing simple para los 6 perfiles
- Soporte SSR/CSR mixto útil para vistas estáticas vs interactivas
- Comunidad grande, fácil contratar después
- Vercel deploy en 1 click si decidimos cloud

**Compromisos:** Hay que ser cuidadoso con "use client" en componentes
que usan hooks; warnings de Hydration mismatch si se mal manejan los
useEffect.

---

## 2026-05 · ADR-002: Estilos inline (no Tailwind, no CSS Modules)

**Contexto:** ¿Cómo manejamos estilos en 50+ componentes?

**Decisión:** Estilos inline con `style={{...}}` y tokens centralizados en
`lib/brand.js`.

**Por qué:**

- Permite copia-pega de componentes entre archivos sin perder estilo
- Tokens en un solo archivo (`brand.red`, `fontDisplay`) son fáciles de
  cambiar globalmente
- Cero overhead de build, cero clases globales conflictivas
- El archivo monolítico inicial era portable a cualquier setup
- Estilos inline son explícitos y fáciles de leer en JSX

**Compromisos:**

- No hay pseudoselectores (`:hover`) sin onMouseEnter/onMouseLeave
- Repetición de estilos cuando un patrón se usa en muchos lugares
  (mitigado extrayendo a componentes UI)
- Sin clases utility (Tailwind sería más rápido para algunos casos)

**Si cambiamos en el futuro:** vanilla-extract o CSS-in-JS con
zero-runtime (Pigment CSS, Panda CSS). NO Tailwind: la decisión va
con que estilos sean explícitos.

---

## 2026-05 · ADR-003: Datos reales del cliente desde el inicio

**Contexto:** ¿Inventamos datos para el demo o usamos los reales del Excel?

**Decisión:** Usar datos reales extraídos de los 3 Excel del cliente.

**Por qué:**

- Las demos a Driscolls / Berrymex / Mallatex se sienten reales, no como
  un toy
- Los operadores reconocen a Karen, Erik, Nayeli en pantalla y entienden
  el sistema más rápido
- Los KPIs (Erik 491 mL/hr, Nayeli 566 mL/hr) son creíbles porque son
  los suyos
- Evita la trampa de "diseñar para datos perfectos" — los datos reales
  tienen casos raros (EZE 503 con 2,900 rollos, sub-pedidos por campo)
  que el sistema debe soportar

**Compromisos:** Hay que tener cuidado con datos sensibles si esto se
publica en GitHub público. Por ahora el repo es privado.

---

## 2026-05 · ADR-004: Fusión Operador + Tablet en un solo perfil

**Contexto:** Inicialmente se pensaron como 2 perfiles separados: app
móvil para operador + tablet fija en línea. Después de discutir con el
cliente, esto no es viable.

**Decisión:** Un solo perfil "Tablet de Línea" con multi-operador.

**Por qué:**

- En planta, los operadores no usan teléfono propio para trabajo
- La tablet ya existe fija en la máquina, no hay razón para duplicar
- Varios operadores pueden trabajar en la misma línea simultáneamente
  (Eva/Juan en LE según el Excel real), el sistema debe soportarlo
- Reduce complejidad de auth y sincronización

**Cómo funciona:**

- Cada tablet se configura una sola vez al instalarse (selecciona su
  línea: LC1, LP, etc.)
- Operadores se "fichan" tocando su foto, varios al mismo tiempo
- Hay un "operador activo" que es el que está tocando piezas, identificado
  visualmente en rojo
- Botón `+` siempre visible para sumar más operadores

---

## 2026-05 · ADR-005: Paleta sin fondos negros

**Contexto:** El diseño inicial usaba fondos negros con acentos rojos
(estética "agressive industrial"). El cliente pidió eliminarlos.

**Decisión:** Solo blanco/paper como fondo, rojo Mallatex como acento.

**Por qué:**

- Operadores en planta usan la tablet durante turnos de 8 horas
- Fondo blanco cansa menos la vista en sesiones largas
- Es coherente con la identidad de marca de Mallatex (blanco/rojo)
- Mejor contraste para imprimir capturas de pantalla si se necesitan

**Compromisos:** Se pierde el dramatismo del diseño inicial. Compensado
con uso generoso del rojo Mallatex en bordes, badges, botones primarios.

---

## 2026-05 · ADR-006: Procesos formales como anclas en cada vista

**Contexto:** Mallatex tiene procesos formales documentados (MT-PC-001,
002, 003) que son la base operativa. ¿Cómo conectamos la app con esos
documentos?

**Decisión:** Cada vista web lleva un tag `<ProcessTag code="MT-PC-XXX"/>`
visible que ancla esa pantalla al proceso formal correspondiente.

**Por qué:**

- Los auditores internos verán que el sistema cumple los procesos
- Los empleados nuevos pueden ir del documento al sistema y viceversa
- Si cambia un proceso (revisión 2027), sabemos exactamente qué vistas
  tocar
- Aumenta credibilidad del sistema frente a dirección

**Cómo se implementa:** componente `<ProcessTag code="MT-PC-003"/>` que
muestra el código en estilo mono con borde rojo en la cabecera de cada
vista relevante.

---

## 2026-05 · ADR-007: Reset al alcance MVP — borrar la "Mallatex Production Suite" verde

**Contexto:** En sesiones anteriores se construyó una "Mallatex Production Suite"
con paleta verde (`#2D7A3E`), Tailwind CSS, Prisma, NextAuth, rutas
`/dashboard`, `/pedidos`, `/catalogo`, `/inventario`, `/calidad`, `/reportes`,
`/control-mp`, `/pedidos-almacen`, `/montacargas`. Esta suite no estaba en el
catálogo de los 6 perfiles del CLAUDE.md §4 y violaba §3 (color rojo) y §6
(estilos inline, no Tailwind).

**Decisión:** Borrar la suite verde completa. Mantener únicamente el módulo
MES alineado con CLAUDE.md y los 3 PROMPTs (Refactor, Persistencia, Roadmap).

**Por qué:**

- Mantener dos universos paralelos confunde al equipo y diluye el roadmap
- La paleta verde no es la identidad Mallatex
- Tailwind viola ADR-002 (estilos inline para portabilidad)
- Las rutas chocaban con los nombres del PROMPT 1 (`/produccion`)
- Las dependencias asociadas (Prisma, NextAuth, recharts, etc.) son ruido

**Compromisos:** Se pierde el trabajo de la suite verde (QA suite incluida).
Mitigación: queda en el historial de git si se necesita rescatar algo.

---

## 2026-05 · ADR-008: Reagendar microservicios al backlog

**Contexto:** Se construyó un backend de microservicios (orders-svc,
inventory-svc, production-svc, identity-svc, sae-bridge) con Fastify + Prisma
+ Redis Streams + JWT, junto con un API Gateway `/api/v1/*` en Next.js. Esto
saltó directamente al backlog del CLAUDE.md §10 (sincronización SAE).

**Decisión:** Borrar el backend microservicios del branch principal.
SAE-bridge y el resto reaparecen cuando el MVP esté validado en planta y
dirección autorice la fase de integración con SAE.

**Por qué:**

- CLAUDE.md §10 ubica la integración SAE en backlog, no en inmediato
- El roadmap inmediato es: refactor → localStorage → demo
- Microservicios + Postgres + Redis multiplican la complejidad de
  arranque local (de `npm run dev` a `docker compose up`)
- Las dependencias (Fastify, ioredis, jose, bcryptjs) violan §8
  ("Cero dependencias nuevas sin avisar")

**Si cambiamos en el futuro:** cuando dirección autorice la integración
SAE, partir del esquema documentado en este ADR como punto de referencia.
El esqueleto queda en el historial de git.

---

## 2026-05 · ADR-009: JSX puro (no TypeScript) en componentes y libs

**Contexto:** El refactor previo migró el monolito `app/page.jsx` a
TypeScript (.tsx + .ts). El PROMPT 1 explícitamente pedía mantenerlo en
JavaScript (.jsx + .js) y CLAUDE.md §6 no menciona TypeScript en el stack.

**Decisión:** Mantener JavaScript puro. Cero TypeScript hasta nuevo aviso.

**Por qué:**

- PROMPT 1 lo pide explícitamente
- ADR-002 prioriza portabilidad y copia-pega de componentes — JS sin tipos
  facilita esto
- El proyecto es un MVP de una sola persona; los tipos agregan overhead
  sin valor proporcional en este estado
- Si en el futuro crece el equipo o llegan endpoints reales con contratos
  estables, JSDoc o un paso a TS gradual es suficiente

**Compromisos:** Se pierde el autocomplete fuerte sobre los modelos de
dominio. Mitigación: JSDoc en `lib/data.js` para las shapes principales.

---

## 2026-05 · ADR-010: Rutas del PROMPT 1 — sin prefijo `/mes/`

**Contexto:** Las rutas previas estaban bajo `/mes/produccion`,
`/mes/almacen`, `/mes/director`, etc. PROMPT 1 y CLAUDE.md §4 las
ubican al raíz: `/produccion`, `/almacen`, `/direccion`, etc.

**Decisión:** Migrar a la convención del PROMPT 1: rutas al raíz, sin
`/mes/` y `/direccion` en lugar de `/director`.

**Por qué:**

- Es la convención formal del manual
- Más cortas → mejor UX al teclear/compartir URLs
- El sistema es 100 % MES — el prefijo `/mes/` era redundante
- `/direccion` es español, coherente con el resto de rutas (cobranza,
  almacen, operaciones)

**Compromisos:** Si en el futuro este MES coexiste con otra app en el
mismo dominio, habrá que mover todo bajo `/mes/`. Mientras tanto, el
sistema es la única app.

---

## 2026-05 · ADR-011: Fase 4 — Módulo de IA Consultiva Pro (planificado, no implementado)

**Contexto:** Se evalúa agregar una capa premium de IA al MES con chat
conversacional, alertas proactivas, insights semanales, recomendaciones
accionables y pronósticos. El roadmap del CLAUDE.md §10 solo tenía
3 fases y un backlog.

**Decisión:** Crear una **Fase 4 explícita** en el roadmap. Documentar el
módulo completo en `docs/modulo-ia-consultiva.md` (capacidades,
arquitectura, costos, riesgos, criterios de arranque). **NO implementar
nada todavía.**

**Por qué:**

- ADR-008 ya enseñó la lección de saltarse al backlog antes del MVP. La
  Fase 4 es premium y requiere MVP estable + datos reales fluyendo en
  planta antes de tener sentido económico
- Dejarlo documentado da claridad al equipo y al cliente sobre la
  visión del producto sin comprometer trabajo prematuro
- El spec ya define el badge `PRO`, las rutas API, el modelo de costos
  y los criterios de "ready to start" — cuando llegue el momento, se
  arranca sin re-deliberar
- Las dependencias nuevas (`@anthropic-ai/sdk`, `zod`) están listadas
  pero NO se instalan; CLAUDE.md §8 exige aprobación previa

**Compromisos:**

- Si el cliente quiere "ya el chat de IA", hay que rechazar y mostrar
  los criterios de la sección 8 del doc
- Documentación que puede quedarse desactualizada si los precios de
  Claude API cambian; revisar antes de arrancar Fase 4

**Si cambiamos en el futuro:** cuando se autorice Fase 4, partir del
sub-roadmap 4.1 al 4.7 del doc. Si emerge un competidor open-source de
Claude API que valga la pena, considerar swap en el `_shared/ai.js`.

**Contexto:** Las rutas previas estaban bajo `/mes/produccion`,
`/mes/almacen`, `/mes/director`, etc. PROMPT 1 y CLAUDE.md §4 las
ubican al raíz: `/produccion`, `/almacen`, `/direccion`, etc.

**Decisión:** Migrar a la convención del PROMPT 1: rutas al raíz, sin
`/mes/` y `/direccion` en lugar de `/director`.

**Por qué:**

- Es la convención formal del manual
- Más cortas → mejor UX al teclear/compartir URLs
- El sistema es 100 % MES — el prefijo `/mes/` era redundante
- `/direccion` es español, coherente con el resto de rutas (cobranza,
  almacen, operaciones)

**Compromisos:** Si en el futuro este MES coexiste con otra app en el
mismo dominio, habrá que mover todo bajo `/mes/`. Mientras tanto, el
sistema es la única app.

---

## Template para agregar nueva decisión

```markdown
## YYYY-MM · ADR-XXX: Título de la decisión

**Contexto:** ¿Qué problema o pregunta estamos resolviendo?

**Decisión:** ¿Qué decidimos hacer?

**Por qué:**

- Razón 1
- Razón 2
- Razón 3

**Compromisos:** ¿Qué cosas malas aceptamos a cambio? ¿Qué alternativas
rechazamos?

**Si cambiamos en el futuro:** ¿Cuál sería la siguiente decisión natural?
```
