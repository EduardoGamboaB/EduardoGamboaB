import { api } from '../api.js';
import { h, clear, fmtDateTime, fmtDate } from '../ui.js';
import { currentPeriod, state } from '../state.js';
import { navigate } from '../router.js';

const STATUS_COLORS = {
  asistencia: 'var(--ok)', retardo: 'var(--warn)', falta: 'var(--err)', omision: '#e08a1e',
  vacaciones: 'var(--purple)', permiso: 'var(--info)', incapacidad: '#9333ea',
  justificada: 'var(--info)', descanso: 'var(--ink-400)', festivo: 'var(--ink-400)',
};
const STATUS_LABEL = {
  asistencia: 'Asistencias', retardo: 'Retardos', falta: 'Faltas', omision: 'Omisiones',
  vacaciones: 'Vacaciones', permiso: 'Permisos', incapacidad: 'Incapacidades',
  justificada: 'Justificadas', descanso: 'Descansos', festivo: 'Festivos',
};

const FLOW = [
  ['1', 'Captura facial', 'El colaborador registra entrada y salida en el checador.'],
  ['2', 'Sincronización', 'La plataforma descarga checadas y aplica horarios y reglas.'],
  ['3', 'Revisión', 'Nómina visualiza asistencias, retardos, faltas y omisiones.'],
  ['4', 'Corrección', 'Se clasifican vacaciones, permisos, incidencias y ajustes.'],
  ['5', 'Autorización', 'Se validan horas extra y se cierra el periodo.'],
  ['6', 'Exportación NOI', 'Se genera la información compatible para su carga.'],
];

function kpi(label, value, foot, accent) {
  return h('div', { class: `card kpi ${accent ? 'accent' : ''}` },
    h('div', { class: 'kpi-label' }, label),
    h('div', { class: 'kpi-value' }, String(value)),
    foot ? h('div', { class: 'kpi-foot' }, foot) : null,
  );
}

export default async function dashboard(el) {
  const period = currentPeriod();
  const data = await api.get('/dashboard' + (period ? `?periodId=${period.id}` : ''));
  clear(el);

  const c = data.counts || {};
  const total = Object.values(c).reduce((a, b) => a + b, 0) || 1;

  // KPIs
  el.appendChild(h('div', { class: 'grid grid-4 mb' },
    kpi('Empleados activos', data.employees, `${data.device?.model || 'Checador'}`, true),
    kpi('Asistencias', c.asistencia || 0, `${c.retardo || 0} retardo(s) en el periodo`),
    kpi('Faltas / Omisiones', (c.falta || 0) + (c.omision || 0), `${c.falta || 0} faltas · ${c.omision || 0} omisiones`),
    kpi('Horas extra autorizadas', data.overtimeHours + ' h', `${data.pending.overtime} por autorizar`),
  ));

  // Fila: distribución + acciones/estado
  const dist = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Distribución de asistencia'), h('span', { class: 'sub' }, period ? period.name : '')),
    h('div', { class: 'card-pad' },
      h('div', { class: 'grid', style: 'gap:10px' },
        ...Object.entries(c).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) =>
          h('div', {},
            h('div', { class: 'row spread', style: 'margin-bottom:5px' },
              h('span', { style: 'display:flex;gap:7px;align-items:center' },
                h('span', { class: 'dot', style: `background:${STATUS_COLORS[k] || '#ccc'}` }),
                h('span', {}, STATUS_LABEL[k] || k)),
              h('span', { class: 'strong mono' }, String(v))),
            h('div', { class: 'progress' }, h('i', { style: `width:${Math.round((v / total) * 100)}%;background:${STATUS_COLORS[k] || '#ccc'}` })),
          )),
      ),
    ),
  );

  const side = h('div', { class: 'grid', style: 'gap:16px;align-content:start' },
    h('div', { class: 'card card-pad' },
      h('div', { class: 'row spread mb' }, h('strong', {}, 'Checador'), h('span', { class: 'badge b-ok' }, 'Hikvision')),
      h('div', { class: 'muted', style: 'font-size:13px' }, data.device?.name || '—'),
      h('div', { class: 'row spread mt' },
        h('span', { class: 'muted' }, 'Última sincronización'),
        h('span', { class: 'strong' }, data.device?.lastSync ? fmtDateTime(data.device.lastSync) : 'Nunca')),
      h('button', { class: 'btn btn-dark btn-block mt', onClick: () => navigate('checador') }, 'Ir al checador'),
    ),
    h('div', { class: 'card card-pad' },
      h('div', { class: 'kpi-label mb' }, 'Pendientes por autorizar'),
      h('div', { class: 'row spread', style: 'margin-bottom:8px' },
        h('span', {}, 'Incidencias'), h('span', { class: `badge ${data.pending.incidents ? 'b-warn' : 'b-ok'}` }, String(data.pending.incidents))),
      h('div', { class: 'row spread' },
        h('span', {}, 'Horas extra'), h('span', { class: `badge ${data.pending.overtime ? 'b-warn' : 'b-ok'}` }, String(data.pending.overtime))),
      h('div', { class: 'row spread mt' },
        h('span', {}, 'Bono puntualidad'), h('span', { class: 'badge b-info' }, `${data.bonusEligible} elegibles`)),
    ),
  );

  el.appendChild(h('div', { class: 'grid mb', style: 'grid-template-columns: 1.6fr 1fr;gap:16px' }, dist, side));

  // Flujo operativo
  el.appendChild(h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Flujo operativo'), h('span', { class: 'sub' }, 'Capa de control entre el checador y Aspel NOI')),
    h('div', { class: 'card-pad' }, h('div', { class: 'flow' },
      ...FLOW.map(([n, t, d]) => h('div', { class: 'step' }, h('div', { class: 'n' }, n), h('h4', {}, t), h('p', {}, d))),
    )),
  ));

  if (period) {
    el.appendChild(h('div', { class: 'note-box mt' },
      `Periodo ${period.name} · ${fmtDate(period.startDate)} al ${fmtDate(period.endDate)} · Estado: ${period.status}. `,
      'La información siempre pasa por revisión y bitácora antes de considerarse lista para nómina.'));
  }
}
