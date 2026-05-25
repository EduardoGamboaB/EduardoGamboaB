// Datos demo del Módulo de IA Consultiva Pro (Fase 4).
// Mock estático — NO hay llamadas a LLM. Solo para presentación a dirección.
// Spec completo: docs/modulo-ia-consultiva.md · ADR-011.

// ---------- Conversaciones del chat ----------
export const initialAiConversations = [
  {
    id: 'conv-eze503',
    role: 'produccion',
    title: 'EZE 503 — proyección de entrega',
    updatedAt: '2026-05-25T09:14:00Z',
    messages: [
      {
        from: 'user',
        text: '¿Va EZE 503 a entregarse a tiempo?',
        ts: '2026-05-25T09:14:00Z',
      },
      {
        from: 'ia',
        text: 'No, con la productividad actual de LC2 (Lorena 218 mL/hr + Jesús 231 mL/hr) EZE 503 termina el 18 de mayo, 3 días después del compromiso (15/05). Las opciones para acelerar son:',
        rationale: 'Cálculo: faltan 1,875 piezas. A 449 mL/hr combinados con piezas de 11.10 × 50 = 555 m² c/u, se proyecta a ~16 días vs 13 disponibles.',
        actions: [
          {
            id: 'act-1',
            label: 'Activar 3ª persona en LC2 turno vespertino',
            impact: '-2 días',
            risk: 'bajo',
          },
          {
            id: 'act-2',
            label: 'Mover FEL 28 a LC4 (Carmen) — libera LC2 a tiempo completo',
            impact: '-3 días',
            risk: 'bajo',
          },
          {
            id: 'act-3',
            label: 'Aprobar tiempo extra los sábados',
            impact: '-2 días',
            risk: 'medio · costo M.O. +18%',
          },
        ],
        ts: '2026-05-25T09:14:08Z',
      },
    ],
  },
  {
    id: 'conv-stock',
    role: 'almacen',
    title: 'Stock crítico Cubresuelo Blanco 130',
    updatedAt: '2026-05-25T08:30:00Z',
    messages: [
      { from: 'user', text: '¿Tenemos suficiente Cubresuelo Blanco 130 para los pedidos en piso?', ts: '2026-05-25T08:30:00Z' },
      {
        from: 'ia',
        text: 'Tienes 1 rollo (R-04702, 3.30 × 67, 34.2 kg) en zona C-3-02. POCC 245 requiere 25 rollos pero está detenido por pago. PSOP 612 ya tiene el material asignado. Recomiendo confirmar con compras el restock antes del 30/05.',
        ts: '2026-05-25T08:30:11Z',
      },
    ],
  },
]

// ---------- Alertas automáticas ----------
export const initialAiAlerts = [
  {
    id: 'alert-1',
    tipo: 'atraso_proyectado',
    priority: 'high',
    title: 'EZE 503 va con 3 días de atraso proyectado',
    detail: 'Driscolls · MALLA ANTIGRANIZO NEGRA · LC2 · proyección 18/05 vs compromiso 15/05',
    rationale: 'Productividad LC2 actual: 449 mL/hr combinados. Faltan 1,875 piezas (1,041,375 m²).',
    actionLabel: 'Ver opciones',
    actionTarget: '/produccion',
    createdAt: '2026-05-25T09:14:00Z',
    dismissed: false,
  },
  {
    id: 'alert-2',
    tipo: 'paro_recurrente',
    priority: 'high',
    title: 'LC3 — paro "sin-material" recurrente (3 esta semana)',
    detail: 'Patrón: Jesús reporta sin-material los lunes y miércoles · tiempo acumulado 47 min',
    rationale: 'Las solicitudes de egreso de Cubresuelo Blanco 130 llegan tarde a almacén. Cuello en el flujo SOLICITO → ENTREGO.',
    actionLabel: 'Revisar flujo egreso',
    actionTarget: '/almacen',
    createdAt: '2026-05-25T08:47:00Z',
    dismissed: false,
  },
  {
    id: 'alert-3',
    tipo: 'anomalia_productividad',
    priority: 'medium',
    title: 'Karen 12% sobre su promedio histórico hoy',
    detail: 'LC1 · 238 mL/hr vs 213 mL/hr histórico · 7 piezas en lo que va del turno',
    rationale: 'Posible cambio en la dinámica de la línea o material más cooperativo. Vale la pena revisar para replicar.',
    createdAt: '2026-05-25T09:00:00Z',
    dismissed: false,
  },
  {
    id: 'alert-4',
    tipo: 'pedido_detenido',
    priority: 'medium',
    title: 'POCC 245 lleva 7 días detenido por pago',
    detail: 'Productora Hassiba · 25 rollos · Cubresuelo Blanco 130 · $66,000 estimado',
    rationale: 'Pedido en estado `detenido` desde 18/05. Cobranza tiene la pelota.',
    actionLabel: 'Ir a Cobranza',
    actionTarget: '/cobranza',
    createdAt: '2026-05-25T07:00:00Z',
    dismissed: false,
  },
  {
    id: 'alert-5',
    tipo: 'stock_critico',
    priority: 'low',
    title: 'Cubresuelo Blanco 130 — 1 rollo disponible',
    detail: 'Suficiente para PSOP 612 pero NO para POCC 245 si se libera',
    createdAt: '2026-05-24T18:00:00Z',
    dismissed: false,
  },
]

// ---------- Insights semanales ----------
export const initialAiInsights = [
  {
    id: 'ins-w21',
    semana: 'Semana 21 · 19-25 mayo 2026',
    fechaGen: '2026-05-25T06:00:00Z',
    autor: 'IA Pro',
    resumen: '14,328 m² producidos (+8.2% vs semana 20). OEE 76% (meta 80%). 94% de pedidos a tiempo · 1 en riesgo (EZE 503). Mermas controladas: 14 m totales (0.10% del producido).',
    oportunidades: [
      { titulo: 'Replicar la dinámica de Karen en LC1', detalle: 'Productividad 12% sobre histórico tres días seguidos. Documentar setup y replicar en LC4 (Carmen) para ganar ~22 m/turno.' },
      { titulo: 'Adelantar FEL 28 ahora que está liberado', detalle: 'Cliente confirmó forma de entrega TRES GUERRAS para 10/06. Arrancar antes del 30/05 evita correr en la última semana.' },
      { titulo: 'Negociar restock Cubresuelo Blanco 130', detalle: 'POCC 245 (25 rollos) en cola. Pedir cotización ahora ahorra 5-7 días si se libera el pago.' },
    ],
    riesgos: [
      { titulo: 'EZE 503 con -3 días de proyección', detalle: 'Driscolls. Recomendación: opción 2 del chat (mover FEL 28 a LC4) gana 3 días sin costo extra.' },
      { titulo: 'LC3 con paros recurrentes "sin-material"', detalle: '3 eventos esta semana. Revisar el handoff con Alberto O. en almacén.' },
      { titulo: 'Erik (LK) llevando solo a la línea de Corte', detalle: 'Si se enferma 1 día, atrasamos PSOP 612 y siguientes. Avanzar capacitación de Eva (tipo C) para emergencias.' },
    ],
    kpis: [
      { label: 'm² producidos', value: '14,328', delta: '+8.2%' },
      { label: 'OEE',           value: '76%',    delta: '+3 pp · meta 80%' },
      { label: 'Entregas a tiempo', value: '17/18 (94%)', delta: '+1 vs sem ant' },
      { label: 'Costo merma',    value: '$28,470', delta: '-12% vs sem ant' },
    ],
    plan: 'Cerrar EZE 503 con la reasignación FEL 28 → LC4. Revisar handoff almacén-LC3 con Carlos A. el lunes 09:00. Cotizar restock Cubresuelo Blanco 130 a Polysembras antes del 29/05.',
  },
  {
    id: 'ins-w20',
    semana: 'Semana 20 · 12-18 mayo 2026',
    fechaGen: '2026-05-18T06:00:00Z',
    autor: 'IA Pro',
    resumen: 'Semana sólida: 13,235 m² producidos. 16/16 pedidos a tiempo. Sin avisos urgentes en LK ni LP.',
    oportunidades: [
      { titulo: 'Aprovechar momentum de LE (Eva + Juan)', detalle: 'Combinaron 600+ mL/hr — récord histórico. Vale la pena documentar el setup.' },
    ],
    riesgos: [
      { titulo: 'Sarai sigue 43% bajo su tipo A esperado', detalle: 'Capacitación adicional o cambio de línea recomendado para evitar frustración.' },
    ],
    kpis: [
      { label: 'm² producidos', value: '13,235', delta: '—' },
      { label: 'OEE',           value: '73%',    delta: 'meta 80%' },
    ],
    plan: 'Continuar plan semanal estándar. Revisar Sarai con RH.',
  },
]

// ---------- Pronósticos ----------
export const initialAiForecasts = {
  cumplimiento: {
    horizonte: '7 días',
    pronosticoOnTime: 89,
    enRiesgo: [
      { pedido: 'EZE 503',  cliente: 'Driscolls',     compromiso: '2026-05-15', proyeccion: '2026-05-18', dias: -3 },
      { pedido: 'PSOP 612', cliente: 'Bioparques',    compromiso: '2026-05-29', proyeccion: '2026-05-29', dias:  0 },
      { pedido: 'VFGC 886', cliente: 'Berrymex',      compromiso: '2026-05-28', proyeccion: '2026-05-27', dias: +1 },
    ],
  },
  oee: {
    horizonte: '14 días',
    promedioProyectado: 78,
    porLinea: [
      { linea: 'LC1', actual: 82, proyectado: 84, tendencia: 'up' },
      { linea: 'LC2', actual: 71, proyectado: 76, tendencia: 'up' },
      { linea: 'LC3', actual: 68, proyectado: 65, tendencia: 'down' },
      { linea: 'LC4', actual: 79, proyectado: 80, tendencia: 'flat' },
      { linea: 'LK',  actual: 91, proyectado: 89, tendencia: 'down' },
      { linea: 'LP',  actual: 84, proyectado: 86, tendencia: 'up' },
      { linea: 'LE',  actual: 88, proyectado: 90, tendencia: 'up' },
    ],
  },
  demanda: {
    horizonte: '30 días',
    porFamilia: [
      { familia: 'ANTIGRANIZO',          m2Proyectados: 412000, vsAnterior: '+12%' },
      { familia: 'CUBRESUELO',           m2Proyectados: 285000, vsAnterior: '+8%' },
      { familia: 'ANTIAFIDO',            m2Proyectados: 92000,  vsAnterior: '-3%' },
      { familia: 'MONOFILAMENTO',        m2Proyectados: 78000,  vsAnterior: '+5%' },
      { familia: 'MALLA RASCHEL',        m2Proyectados: 42000,  vsAnterior: '+18%' },
    ],
  },
  carga: {
    horizonte: '7 días',
    porOperador: [
      { operador: 'Erik',   linea: 'LK',  capacidadHr: 491, asignadoHr: 510, sobrecarga: '+4%' },
      { operador: 'Lorena', linea: 'LC2', capacidadHr: 218, asignadoHr: 252, sobrecarga: '+16%' },
      { operador: 'Karen',  linea: 'LC1', capacidadHr: 213, asignadoHr: 184, sobrecarga: '-14%' },
      { operador: 'Eva',    linea: 'LE',  capacidadHr: 486, asignadoHr: 420, sobrecarga: '-14%' },
      { operador: 'Nayeli', linea: 'LP',  capacidadHr: 566, asignadoHr: 540, sobrecarga: '-5%' },
    ],
  },
}
