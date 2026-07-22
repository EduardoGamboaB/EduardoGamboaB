import { api } from '../../api.js';
import { h, clear, empty } from '../../ui.js';
import { currentPeriod } from '../../state.js';

function kpi(label, value, foot, accent) {
  return h('div', { class: `card kpi ${accent ? 'accent' : ''}` },
    h('div', { class: 'kpi-label' }, label), h('div', { class: 'kpi-value' }, value), foot ? h('div', { class: 'kpi-foot' }, foot) : null);
}

export default async function rhIndicadores(el) {
  clear(el);
  const period = currentPeriod();
  const d = await api.get('/rh/indicators' + (period ? `?periodId=${period.id}` : ''));
  if (!d || !d.period) { el.appendChild(empty('📊', 'Sin datos del periodo.')); return; }

  el.appendChild(h('div', { class: 'grid grid-4 mb' },
    kpi('% Asistencia', d.asistencia + '%', 'del total laborable', true),
    kpi('% Puntualidad', d.puntualidad + '%', 'llegadas a tiempo'),
    kpi('% Ausentismo', d.ausentismo + '%', `${d.counts.faltas} faltas · ${d.counts.omisiones} omis.`),
    kpi('Tiempo extra', d.overtimeHours + ' h', `${d.bonusEligible} elegibles a bono`),
  ));

  el.appendChild(h('div', { class: 'grid mb', style: 'grid-template-columns:1.5fr 1fr;gap:16px' },
    // Por área
    h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Asistencia por área'), h('span', { class: 'sub' }, d.period.name)),
      h('div', { class: 'card-pad', style: 'display:grid;gap:12px' }, ...Object.entries(d.byArea).map(([area, a]) => {
        const tot = a.asistencias + a.retardos + a.faltas || 1;
        return h('div', {},
          h('div', { class: 'row spread', style: 'margin-bottom:5px' }, h('strong', {}, area), h('span', { class: 'muted mono' }, `${Math.round((a.asistencias / tot) * 100)}% asist.`)),
          h('div', { class: 'progress', style: 'display:flex' },
            h('i', { style: `width:${(a.asistencias / tot) * 100}%;background:var(--ok)` }),
            h('i', { style: `width:${(a.retardos / tot) * 100}%;background:var(--warn)` }),
            h('i', { style: `width:${(a.faltas / tot) * 100}%;background:var(--err)` })),
          h('div', { class: 'muted mt', style: 'font-size:11px' }, `${a.asistencias} asist · ${a.retardos} ret · ${a.faltas} faltas`));
      }))),
    // Pendientes + top retardos
    h('div', { class: 'grid', style: 'gap:16px;align-content:start' },
      h('div', { class: 'card card-pad' }, h('div', { class: 'kpi-label mb' }, 'Pendientes'),
        h('div', { class: 'row spread', style: 'margin-bottom:6px' }, h('span', {}, 'Incidencias por autorizar'), h('span', { class: `badge ${d.incidenciasPendientes ? 'b-warn' : 'b-ok'}` }, String(d.incidenciasPendientes))),
        h('div', { class: 'row spread' }, h('span', {}, 'Tickets abiertos'), h('span', { class: `badge ${d.ticketsAbiertos ? 'b-warn' : 'b-ok'}` }, String(d.ticketsAbiertos)))),
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', {}, 'Top retardos')),
        d.topRetardos.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('tbody', {}, ...d.topRetardos.map((r) => h('tr', {}, h('td', {}, r.employee), h('td', { class: 'num strong mono' }, String(r.retardos)))))))
          : h('div', { class: 'card-pad muted' }, 'Sin retardos en el periodo.')),
    ),
  ));

  el.appendChild(h('div', { class: 'note-box' }, `Indicadores del periodo ${d.period.name} sobre ${d.empleados} empleados activos.`));
}
