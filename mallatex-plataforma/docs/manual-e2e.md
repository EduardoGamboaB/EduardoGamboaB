# Manual de uso — Suite E2E de la Plataforma Mallatex

La suite E2E (`backend/e2e.suite.mjs`) valida la plataforma **de extremo a
extremo, módulo por módulo**: hace peticiones HTTP reales contra el **gateway**
(igual que la web y la app móvil) y verifica **206 aserciones** que cubren los
seis microservicios, el kiosco de planta, la seguridad de sesión y la
paginación del API. No usa mocks: requiere el stack completo arriba
(PostgreSQL sembrado + 6 servicios + gateway).

---

## 1. Qué valida

| Bloque | Secciones | Qué se comprueba |
|---|---|---|
| **IDENTITY** | autenticación · usuarios (CRUD) · matriz de acceso | Login admin (40 módulos web) y de empleados por código+PIN (perfiles comercial/operativo/línea), rechazo de password incorrecto, 401 sin token y 403 de empleado en rutas admin; alta/edición/baja de usuarios y login del usuario recién creado; catálogo móvil (18 módulos), matriz completa (146 grants) y que **conceder/revocar un módulo se refleja en el siguiente login**. |
| **ATTENDANCE** | catálogos · checadas y motor · incidencias y tiempo extra · periodos/NOI · percepciones variables · RH · portal del empleado · campo (geocerca) y kiosco | CRUD de empleados/horarios/sitios; cálculo del día (retardo ≤15 min, falta por retardo mayor, tolerancia 10 min), corrección manual sobre incidencia autorizada; bloques de 30 min de tiempo extra; cierre de periodo y export NOI; percepciones variables por fuente; vacaciones, recibos, tickets e indicadores; portal del empleado (solicitudes `vacaciones`/`permiso_goce`/`permiso_singoce`); checada de campo con geocerca y checada de kiosco con línea de origen. |
| **CRM** | productos y clientes · ciclo del vendedor (MTX002) · back-office | Catálogos del gerente; ciclo móvil completo: ruta → visita con evidencia → cotización con folio → pedido → solicitud de viáticos → gasto; decisiones de back-office, facturación y **webhook de pagos Aspel** (firmado con `ASPEL_WEBHOOK_SECRET`) que genera la comisión. |
| **MES** | catálogos y órdenes · candado de cobranza · piso de producción · almacén · tablero/KPIs/tablet | Órdenes y subórdenes; el **gate de cobranza** impide producir sin pago confirmado; rollos, avisos, mermas y productividad; documentos de almacén MT-DT-001/002/006; KPIs del tablero y la tablet de línea (avance por orden). |
| **LEADS** | eventos · captura · sorteo y dashboard | Eventos Anaberries, captura por staff y **autoregistro público** (sin token), elegibilidad, sorteo del lado servidor y dashboard. |
| **KIOSCO DE PLANTA** | checador por línea y autoservicio | Líneas públicas para configurar la tablet, check-in/out con origen `KIOSKO:<línea>`, autoservicio RH del operador y expiración de sesión. |
| **MARKETING** | banco de materiales · formatos · publicaciones · calendario · impresos | Subida de imagen (blob en BD) y descarga con su MIME; **video sin S3 queda `pendingSync`** y `sync-s3` responde `409 S3_OFF` si no hay bucket; solicitudes con folio `FMT-` y máquina de estados (entregar exige entregable); publicaciones con contador de no-vistas del vendedor; campañas con vigencia calculada y rechazo de rangos inválidos; inventario de impresos con existencia calculada, salida de vendedor y `409 STOCK_INSUFICIENTE`. |
| **SEGURIDAD** | revocación de sesión · rate limit | El logout revoca el token del lado servidor (rechazo inmediato 401); fuerza bruta de login bloqueada con `429 + Retry-After` sin afectar otras cuentas. |
| **API** | paginación retro-compatible | Sin `?page` se preserva el shape histórico; con `?page&pageSize` responde `{items,total,page}` en leads, checadas, órdenes MES y clientes CRM. |

---

## 2. Requisitos previos

- Node.js 20+ y dependencias instaladas:
  `npm install --workspaces --include-workspace-root`
- PostgreSQL accesible (local o Docker).
- Puertos libres: `3000` (gateway) y `3001–3006` (servicios).

---

## 3. Preparación y ejecución

### Opción A — Node directo (recomendada para desarrollo)

```bash
# 1) Variables de entorno (misma DATABASE_URL y JWT_SECRET en TODO)
export DATABASE_URL='postgres://mallatex:mallatex@localhost:5432/mallatex'
export JWT_SECRET='e2e-secret'
export ASPEL_WEBHOOK_SECRET='hook-secret'   # firma del webhook CRM

# 2) Base limpia y sembrada (la suite asume los conteos del seed)
npm run db:reset

# 3) Stack completo: gateway + 6 microservicios
npm run dev

# 4) En otra terminal, la suite
npm run test:e2e
```

### Opción B — Docker Compose

```bash
cp .env.example .env
docker compose up --build          # db + migrate/seed + 6 servicios + gateway
npm run test:e2e                   # apunta a http://localhost:3000
```

### Variables que lee la suite

| Variable | Default | Uso |
|---|---|---|
| `GATEWAY_URL` | `http://localhost:3000` | A dónde dispara todas las peticiones. Cambiarla permite correr la suite **contra un ambiente desplegado** (staging). |
| `ASPEL_WEBHOOK_SECRET` | `hook-secret` | Debe coincidir con el del servicio CRM para la prueba del webhook de pagos. |

> **Zona horaria:** el motor de asistencia interpreta checadas en hora de pared
> de la planta. El servicio `attendance` debe correr con
> `TZ=America/Mexico_City` (así está en `docker-compose.yml` y `render.yaml`);
> si lo arrancas a mano en otra TZ, las pruebas de retardos pueden fallar.

---

## 4. Cómo leer la salida

```
== IDENTITY · autenticación ==
  ✓ login admin devuelve token
  ✓ admin recibe 40 módulos web
  ...
== MARKETING · banco de materiales (assets) ==
  ✗ sync-s3 sin configurar → 409 S3_OFF (200)

========================================
RESULTADO: 204 OK · 1 FALLAS

Fallas:
  ✗ MARKETING · banco de materiales (assets) › sync-s3 sin configurar → 409 S3_OFF (200)
```

- Cada `✓/✗` es una aserción; el texto entre paréntesis en las fallas es el
  **valor real observado** (status o payload recortado), la primera pista del
  diagnóstico.
- Al final se listan todas las fallas con su sección.
- **Exit code**: `0` si todo pasó, `1` si hubo fallas — apto para CI
  (`npm run test:e2e` como paso posterior a levantar el stack).

---

## 5. Reglas de una corrida limpia

1. **Resetea la base entre corridas**: la suite crea datos (usuarios, empleados,
   campañas, artículos) y aunque limpia lo crítico, los conteos exactos del
   seed (40/18 módulos, 146 grants, 5 usuarios, 4 empleados) son parte de las
   aserciones. `npm run db:reset` te regresa al estado esperado.
2. **Reinicia los servicios si cambiaste seed o código**: la caché de
   revocación de tokens (30 s) y el rate limiter viven en memoria del proceso.
3. **Mismo `JWT_SECRET` en todos los procesos**: si difiere, verás 401 masivos
   en todo lo autenticado.
4. El rate limiter cuenta **intentos fallidos** (10 por 15 min por ip+cuenta);
   la sección de seguridad lo dispara con una cuenta ficticia, así que no
   bloquea a los usuarios demo.

---

## 6. Cómo extender la suite

Helpers disponibles dentro de `backend/e2e.suite.mjs`:

```js
sec('MI MÓDULO · caso de uso');            // abre una sección en la salida
const r = await post('/api/mi-ruta', {     // req/get/post/put/del vía gateway
  token: admin,                            // Bearer opcional
  body: { campo: 'valor' },                // JSON opcional
});
ok('descripción de la aserción', r.status === 201 && r.json?.id, JSON.stringify(r.json).slice(0, 80));
```

Convenciones:

- **Una aserción = un comportamiento observable** (status + shape del JSON).
  Incluye siempre el tercer argumento con el valor real para diagnóstico.
- Prueba el caso feliz **y** el rechazo (403 de perfil sin permiso, 409 de
  regla de negocio, 4xx de validación).
- Si agregas módulos al seed, **actualiza los conteos**: «admin recibe N
  módulos web», «catálogo móvil (N)», «matriz completa (N grants)», «listar
  usuarios (N sembrados)» y los módulos por perfil (p. ej. MTX002).
- Los tokens de secciones previas (`admin`, `empCom`, `empOp`, `empLinea`,
  `mkt`) están disponibles: reutilízalos en vez de reloguear.

---

## 7. Solución de problemas

| Síntoma | Causa probable | Acción |
|---|---|---|
| Todas las secciones fallan con `fetch failed` / status `000` | Gateway abajo o `GATEWAY_URL` incorrecta | `curl http://localhost:3000/api/health`; levantar `npm run dev` |
| Una sección entera falla con 502/504 | El microservicio de ese contexto no arrancó | Revisar el log del servicio (puerto 3001–3006) y su `/api/health` directo |
| 401 en todo lo autenticado | `JWT_SECRET` distinto entre identity y los demás servicios | Exportar el mismo secreto en todos los procesos y reiniciar |
| Fallan los conteos (módulos/grants/usuarios) | Base no reseteada, o seed modificado sin actualizar la suite | `npm run db:reset`; si el seed cambió a propósito, actualizar las aserciones de conteo |
| Fallan retardos/faltas de asistencia | Servicio `attendance` corriendo en TZ ≠ `America/Mexico_City` | Arrancarlo con `TZ=America/Mexico_City` |
| `sync-s3` no devuelve 409 | Hay S3 configurado en el ambiente | Es correcto: esa aserción documenta el modo *sin* bucket; en ambientes con S3 se espera migración real |
| `login del usuario nuevo` falla en re-corridas | El usuario `e2e@mallatex.mx` quedó de una corrida interrumpida | `npm run db:reset` |
| 429 inesperado al inicio | Rate limiter con estado de una corrida previa (<15 min) | Reiniciar el servicio identity o esperar la ventana |

---

## 8. Pruebas complementarias

- **Unitarias** (dominio puro, sin BD): `npm test` — 206 pruebas en los 7
  workspaces (`node --test`).
- **Build del frontend**: `cd frontend && npx next build` — las 43 rutas deben
  compilar sin errores.
- La suite E2E es la red de seguridad final: correrla **después** de unitarias
  y build reproduce el mismo orden que el checklist de liberación
  ([`deploy/go-live.md`](../deploy/go-live.md)).
