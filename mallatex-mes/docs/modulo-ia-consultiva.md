# Módulo de IA Consultiva Pro — Fase 4

> Capa premium / monetizable. Vive **sobre** los 6 perfiles existentes,
> no como un 7° perfil. Solo se construye con dirección autorizando + MVP
> estable + datos reales fluyendo.

---

## 1. ¿Qué es?

Un copiloto de IA específico del dominio Mallatex que combina cinco
capacidades en un solo asistente:

1. **Chat conversacional** — preguntas en lenguaje natural sobre el estado
   del MES, con respuestas basadas en datos reales (no genéricas).
2. **Alertas automáticas** — detecta atrasos proyectados, paros
   recurrentes y anomalías de productividad antes de que escalen.
3. **Insights semanales** — cada lunes 06:00 genera una "carta" con
   top 3 oportunidades, top 3 riesgos y comparativa vs. semana anterior.
4. **Recomendaciones accionables** — cada sugerencia trae un botón
   "Aplicar" que invoca métodos del `AppContext` para ejecutar el cambio.
5. **Pronósticos** — cumplimiento de entregas, OEE proyectado, demanda
   por familia, carga por operador a 7/14/30 días.

---

## 2. Marca

- Badge **`PRO`** en rojo Mallatex (`#E30613`), idéntico estilo al badge
  `MES` del logo actual (componente `MallatexMESLogo`).
- Punto de entrada: **botón flotante** en esquina inferior derecha de
  cada perfil web. En la tablet de línea va dentro del header (icono
  pequeño, sin el drawer — el operador no tiene tiempo de conversar,
  solo recibe alertas).
- Drawer/Modal lateral 400 px ancho con tabs: **Chat · Alertas ·
  Insights · Pronósticos**.

---

## 3. Por qué Pro / Premium

- **Costo variable real** — cada llamada al LLM cuesta dinero (Claude API
  o equivalente). Cargarlo al cliente como add-on mensual es coherente
  con la unidad económica.
- **Diferenciador competitivo** — otros MES locales no tienen capa de IA
  consultiva integrada. Es una ventaja en venta para Mallatex y
  potenciales nuevos clientes.
- **Requiere base estable** — el modelo necesita datos reales del MES
  fluyendo. Sin Fases 2-3 completas, las respuestas son inventadas y
  pierde credibilidad.

---

## 4. Capacidades detalladas

### 4.1 Chat conversacional

- Endpoint: `POST /api/ai/chat` (Next.js API route)
- Backend: **Anthropic Claude** vía `@anthropic-ai/sdk` (alineado con el
  stack de Claude Code que usa el equipo)
- **Tool use** con herramientas que el modelo puede invocar:
  - `listOrders({estado, cliente, linea})` → consulta `orders` del context
  - `getOrder(id)` → detalle + bitácora + sub-pedidos
  - `productividadOperador(name, desde, hasta)` → datos del Excel real
  - `lineaStatus(id)` → OP activa + avisos + último registro
  - `mermasMes({pedido, categoria})` → MT-DT-003
  - `simularReasignacion({opId, lineaNueva, operadorNuevo})` → calcula
    impacto sin aplicar el cambio
- Streaming SSE para respuestas progresivas
- Cada mensaje incluye el rol del usuario (`Producción`, `Cobranza`...)
  para personalizar el tono y los datos accesibles

**Ejemplo:**
> **Jefe Producción:** ¿Va EZE 503 a entregarse a tiempo?
> **IA:** No. Con la productividad actual de LC2 (218 mL/hr de Lorena +
> 231 de Jesús), EZE 503 termina el **18 de mayo**, 3 días después del
> compromiso (15/05). Las opciones para acelerar son:
>   1. Activar la 3ª persona en LC2 turno vespertino → -2 días
>   2. Mover FEL 28 a LC4 (Carmen) → libera LC2 a tiempo completo → -3 días
>   3. Aprobar tiempo extra los sábados → -2 días
>
> [📌 Aplicar opción 2] [📊 Ver simulación] [💬 Otra pregunta]

### 4.2 Alertas automáticas

- Worker background (`/api/ai/cron/alertas`) que corre cada 15 min
- Reglas combinadas (heurísticas + LLM clasificador):
  - **Atraso proyectado** — `compromiso < fecha_proyectada(productividad_actual)`
  - **Paro recurrente** — mismo `tipo` en misma `linea` ≥ 3 veces / semana
  - **Anomalía operador** — productividad ±20% vs. su histórico mL/hr
  - **Stock crítico** — material faltante para pedidos `liberado` en cola
  - **Pedido detenido** — días en `detenido` > 5
- Cada alerta se inserta en `addNotification` (slice nuevo de PROMPT 3.3)
  con `priority: 'high'` y `from: 'IA Pro'`
- El operador en la tablet NO recibe push si su línea no es la afectada
  (regla de oro: no interrumpir piso de producción)

### 4.3 Insights semanales

- Cron: lunes 06:00 (zona horaria America/Mexico_City)
- Output: documento markdown con secciones fijas:
  - Resumen semana
  - Top 3 oportunidades (con números y acción sugerida)
  - Top 3 riesgos
  - KPIs vs. semana anterior (m² producidos, OEE, entregas a tiempo, costo merma)
  - Plan sugerido para la semana
- Se guarda en `productividad` → nuevo slice `insightsSemanales[]`
- Visible en el tab `Insights` del drawer + email opcional a dirección

### 4.4 Recomendaciones accionables

Cada respuesta del chat o cada alerta puede incluir 1-3
**acciones aplicables**. Estructura:

```js
{
  id: 'rec_01HXR3K8MZP',
  description: 'Reasignar VFGC 891 de Karen (LC1) a Lorena (LC2)',
  rationale: 'Lorena tiene 12% menos carga; libera a Karen para EZE 503',
  impact: { tiempoAhorrado: '2 días', riesgo: 'bajo' },
  action: {
    method: 'updateOrder',
    args: { id: 'VFGC 891', linea: 'LC2', operador: [2] },
  },
}
```

El botón **Aplicar** llama al método del `AppContext` con los args
exactos. El usuario ve el resultado inmediatamente en la bitácora.

### 4.5 Pronósticos

Modelos simples (pueden empezar como reglas + statsmodels, luego upgrade
a series temporales):

- **Cumplimiento de entregas** — para cada pedido `en-produccion` calcula
  `fecha_proyectada = fecha_inicio + (meta - hechas) / promedio_mL_hr`
- **OEE proyectado por línea** — media móvil 7 días + ajuste por avisos
- **Demanda por familia** — agregado mensual por `material` de los pedidos
  históricos, regresión lineal sobre 12 meses
- **Carga por operador** — para los próximos 7 días, suma de OP asignadas
  vs. capacidad teórica (mL/hr × horas turno)

Visualización: gauges + line charts simples (sin nueva dependencia —
usar SVG inline). NO usar recharts (ADR-007 lo eliminó).

---

## 5. Arquitectura técnica

### 5.1 Stack adicional sobre el MVP

| Componente | Tecnología | Notas |
|---|---|---|
| LLM | Anthropic Claude API | `@anthropic-ai/sdk` — alineado con stack |
| API | Next.js API routes | `/api/ai/*` — sin nuevos servicios |
| Streaming | SSE nativo | sin dependencia adicional |
| Cron | Vercel Cron (si Vercel) o cron de servidor | un solo job cada 15 min |
| Estado | nuevo slice `ai` en `AppContext` | persiste en localStorage |

**Dependencias nuevas (pedir aprobación antes de instalar):**

- `@anthropic-ai/sdk` (~120 KB)
- Opcional: `zod` para validar tool use schemas (~30 KB)

Total: 2 dependencias. Conservador respecto a CLAUDE.md §8.

### 5.2 Rutas y archivos esperados

```
src/app/api/ai/
├── chat/route.js              POST · streaming SSE
├── cron/alertas/route.js      GET · llamado por cron
├── cron/insights/route.js     GET · llamado por cron semanal
└── forecast/[tipo]/route.js   GET · cumplimiento|oee|demanda|carga

src/components/ia/
├── AssistantBubble.jsx        botón flotante PRO
├── AssistantDrawer.jsx        drawer con tabs
├── ChatPane.jsx               conversación + streaming
├── AlertsPane.jsx             lista de alertas activas
├── InsightsPane.jsx           carta semanal
├── ForecastsPane.jsx          4 pronósticos
└── ApplyButton.jsx            botón aplicar acción

src/lib/ia/
├── tools.js                   definiciones de tool use
├── prompts.js                 system prompts por rol
└── forecasts.js               heurísticas de pronóstico
```

### 5.3 Persistencia

Nuevo slice del `AppContext` (PROMPT 2 lo persiste automáticamente):

```js
ai: {
  conversations: [{ id, role, messages: [...], updatedAt }],
  alerts: [{ id, tipo, priority, message, createdAt, dismissed }],
  insights: [{ semana, markdown, createdAt }],
  forecasts: { cumplimiento: {...}, oee: {...}, demanda: {...}, carga: {...} },
}
```

### 5.4 Privacidad

- Los datos del MES **no salen del control del cliente**: se envían a
  Claude API en cada llamada pero el SDK no entrena con ellos
  (política Anthropic estándar para clientes de API).
- Opcional posterior: deploy on-premise con un modelo local (Llama 3 70B
  o similar) si Mallatex requiere zero-egress.
- Nunca se envían a la IA: contraseñas, números de cuenta, RFC,
  direcciones personales. Solo datos operativos.

---

## 6. Modelo de costos (estimado)

Asumiendo Claude 4.6 Sonnet a precios estándar y uso moderado:

| Concepto | Volumen mensual | Costo aprox. |
|---|---|---|
| Chat (200 mensajes / mes / usuario × 6 perfiles activos) | 1,200 msgs | $8-15 USD |
| Alertas (cron 15 min × 24h × 30d) | 2,880 ejec. | $5-10 USD |
| Insights semanales | 4 cartas | $2 USD |
| Pronósticos (cron diario) | 30 ejec. | $1 USD |
| **Total estimado** | | **$15-30 USD/mes** |

Plan de venta a Mallatex: **add-on $50-100 USD/mes por planta** — cubre
costos con margen sano.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Alucinaciones del LLM con datos críticos | Tool use estricto · validar con esquemas Zod · "no inventar" en system prompt |
| Costo descontrolado por consultas | Rate limit por usuario (10/min) + cache de respuestas similares + métrica de tokens visible en dirección |
| Privacidad de datos del cliente | Anthropic API tier con cláusulas no-training · log de qué se envía en cada llamada |
| Dependencia de internet | Modo "offline" del MES no incluye IA (es premium) · graceful degradation |
| Resistencia operadores | IA NO escribe automáticamente · siempre requiere confirmación humana |

---

## 8. Criterios para arrancar Fase 4

Marcar todos antes de invertir tiempo en implementar:

- [ ] Fases 1-3 completas y validadas (MVP estable)
- [ ] Datos reales fluyendo en planta mínimo 4 semanas
- [ ] Dirección Mallatex autoriza presupuesto LLM y add-on Pro
- [ ] Usuario aprueba dependencias `@anthropic-ai/sdk` + `zod`
- [ ] Decisión sobre branding del badge `PRO` confirmada
- [ ] Datos personales sensibles separados del payload a IA

---

## 9. Roadmap de implementación cuando empiece Fase 4

Sub-prompts sugeridos (estilo PROMPT 3.X):

- **4.1** Asistente flotante + drawer · sin LLM real, mock responses
- **4.2** Conectar `/api/ai/chat` a Claude API + tool use básicos
- **4.3** Motor de alertas + slice `notifications` extendido
- **4.4** Generador de insights semanales + cron
- **4.5** Pronósticos (4 modelos heurísticos) + visualizaciones
- **4.6** Recomendaciones accionables + botón Aplicar
- **4.7** Telemetría de uso, costos por consulta, dashboard de Pro
