import { api } from '../../api.js';
import { h, clear, fmtDate, fmtDow, statusBadge, empty } from '../../ui.js';
import { state } from '../../state.js';

function kpi(label, value, foot, accent) {
  return h('div', { class: `card kpi ${accent ? 'accent' : ''}` },
    h('div', { class: 'kpi-label' }, label), h('div', { class: 'kpi-value' }, String(value)), foot ? h('div', { class: 'kpi-foot' }, foot) : null);
}

export default async function miAsistencia(el) {
  clear(el);
  const me = await api.get('/portal/me');
  const emp = me.employee;
  const vac = me.vacation;

  const periodSel = h('select', {}, ...me.periods.map((p) => {
    const o = h('option', { value: p.id }, `${p.name} · ${p.status}`);
    if (p.id === state.currentPeriodId) o.selected = true;
    return o;
  }));
  const body = h('div', {});

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, `Hola, ${emp.name.split(' ')[0]}`),
        h('div', { class: 'muted mt' }, `${emp.code} · ${emp.department} · ${emp.position || ''} · Turno: ${me.scheduleName || '—'}`)),
      h('div', { class: 'row', style: 'gap:8px' },
        h('span', { class: 'badge b-purple' }, `🌴 ${vac.available} días de vacaciones`),
        emp.faceEnrolled ? h('span', { class: 'badge b-ok' }, '✓ Rostro registrado') : h('span', { class: 'badge b-gray' }, 'Sin rostro'))),
  ));

  el.appendChild(h('div', { class: 'toolbar' }, h('label', { class: 'field' }, h('span', {}, 'Periodo'), periodSel)));
  el.appendChild(body);

  async function load() {
    const data = await api.get(`/portal/me/attendance?periodId=${periodSel.value}`);
    const c = data.summary?.counters || {};
    clear(body);
    body.appendChild(h('div', { class: 'grid grid-4 mb' },
      kpi('Asistencias', c.asistencias || 0, `${c.retardos || 0} retardo(s)`, true),
      kpi('Faltas', c.faltas || 0, `${c.omisiones || 0} omisión(es)`),
      kpi('Vacaciones / permisos', (c.vacaciones || 0) + (c.permisos || 0) + (c.incapacidades || 0), 'en el periodo'),
      kpi('Tiempo extra', ((data.summary?.overtimeMinutes || 0) / 60).toFixed(1) + ' h', data.summary?.bonusEligible ? 'Bono: elegible' : 'Bono: no'),
    ));
    const rows = data.rows || [];
    const card = h('div', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', {}, 'Mi asistencia diaria'), h('span', { class: 'sub' }, data.period?.name || '')));
    if (!rows.length) card.appendChild(empty('☑', 'Sin registros en el periodo.'));
    else card.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Entrada'), h('th', {}, 'Salida'), h('th', { class: 'num' }, 'Trab.'), h('th', { class: 'num' }, 'Retardo'), h('th', {}, 'Estatus'))),
      h('tbody', {}, ...rows.map((r) => h('tr', {},
        h('td', {}, h('div', { class: 'strong' }, fmtDate(r.date, { day: '2-digit', month: 'short' })), h('div', { class: 'muted', style: 'font-size:11px;text-transform:capitalize' }, fmtDow(r.date))),
        h('td', { class: 'mono' }, r.firstIn || '—'), h('td', { class: 'mono' }, r.lastOut || '—'),
        h('td', { class: 'num mono' }, r.workedMinutes ? (r.workedMinutes / 60).toFixed(1) + 'h' : '—'),
        h('td', { class: 'num mono' }, r.lateMinutes ? r.lateMinutes + 'm' : '—'),
        h('td', {}, statusBadge(r.status))))))));
    body.appendChild(card);
  }
  periodSel.addEventListener('change', load);
  await load();
}
