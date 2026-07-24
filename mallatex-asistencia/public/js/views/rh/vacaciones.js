import { api } from '../../api.js';
import { h, clear, empty } from '../../ui.js';

export default async function rhVacaciones(el) {
  clear(el);
  const rows = await api.get('/rh/vacation-balances');
  const totalDisp = rows.reduce((s, r) => s + r.available, 0);
  el.appendChild(h('div', { class: 'note-box mb' }, 'Saldos calculados conforme a la Ley Federal del Trabajo (reforma 2023) según la antigüedad de cada colaborador.'));
  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Saldos de vacaciones'), h('span', { class: 'sub' }, `${rows.length} empleados · ${totalDisp} días disponibles`)));
  if (!rows.length) { card.appendChild(empty('🌴', 'Sin empleados.')); el.appendChild(card); return; }
  card.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Empleado'), h('th', {}, 'Área'), h('th', { class: 'num' }, 'Antigüedad'), h('th', { class: 'num' }, 'Derecho'), h('th', { class: 'num' }, 'Tomados'), h('th', { class: 'num' }, 'Disponibles'), h('th', {}, ''))),
    h('tbody', {}, ...rows.map((r) => h('tr', {},
      h('td', {}, h('div', { class: 'strong' }, r.name), h('div', { class: 'muted', style: 'font-size:11px' }, r.code)),
      h('td', { class: 'muted' }, r.department || '—'),
      h('td', { class: 'num mono' }, `${r.years} año(s)`),
      h('td', { class: 'num mono' }, String(r.entitled)),
      h('td', { class: 'num mono' }, String(r.taken)),
      h('td', { class: 'num mono strong' }, String(r.available)),
      h('td', { style: 'width:120px' }, h('div', { class: 'progress' }, h('i', { style: `width:${r.entitled ? Math.round((r.available / r.entitled) * 100) : 0}%` }))),
    ))))));
  el.appendChild(card);
}
