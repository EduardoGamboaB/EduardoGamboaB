import { api } from '../api.js';
import { h, clear, fmtDateTime, empty, field } from '../ui.js';

const ACTION_LABEL = {
  login: 'Inicio de sesión', create: 'Alta', update: 'Actualización', delete: 'Eliminación',
  deactivate: 'Baja', correct: 'Corrección', authorize: 'Autorización', reject: 'Rechazo',
  close: 'Cierre', reopen: 'Reapertura', sync: 'Sincronización', reprocess: 'Reproceso',
  export: 'Exportación NOI', seed: 'Carga inicial',
};
const ACTION_CLS = {
  authorize: 'b-ok', create: 'b-ok', reject: 'b-err', delete: 'b-err', deactivate: 'b-err',
  correct: 'b-warn', close: 'b-info', reopen: 'b-info', export: 'b-purple', sync: 'b-info', reprocess: 'b-gray',
  login: 'b-gray', update: 'b-gray', seed: 'b-gray',
};

export default async function audit(el) {
  clear(el);
  const entitySel = h('select', {},
    h('option', { value: '' }, 'Todas las entidades'),
    ...['attendance', 'incident', 'overtime', 'period', 'employee', 'schedule', 'device', 'noi', 'user', 'auth', 'settings']
      .map((e) => h('option', { value: e }, e)));
  const tableWrap = h('div', { class: 'card' });

  async function load() {
    const rows = await api.get('/audit?limit=300' + (entitySel.value ? `&entity=${entitySel.value}` : ''));
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Bitácora de trazabilidad'), h('span', { class: 'sub' }, `${rows.length} evento(s)`)));
    if (!rows.length) { tableWrap.appendChild(empty('❐', 'Sin eventos registrados.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Fecha y hora'), h('th', {}, 'Usuario'), h('th', {}, 'Acción'), h('th', {}, 'Entidad'), h('th', {}, 'Detalle'))),
      h('tbody', {}, ...rows.map((a) => h('tr', {},
        h('td', { class: 'mono muted', style: 'white-space:nowrap' }, fmtDateTime(a.timestamp)),
        h('td', {}, h('div', { class: 'strong' }, a.userName), a.role ? h('div', { class: 'muted', style: 'font-size:11px' }, a.role) : null),
        h('td', {}, h('span', { class: `badge ${ACTION_CLS[a.action] || 'b-gray'}` }, ACTION_LABEL[a.action] || a.action)),
        h('td', { class: 'muted mono', style: 'font-size:12px' }, a.entity),
        h('td', { class: 'muted' }, a.detail || '—'),
      ))),
    )));
  }

  entitySel.addEventListener('change', load);
  el.appendChild(h('div', { class: 'note-box mb' }, 'Cada ajuste queda registrado con usuario, fecha y motivo. La trazabilidad es la base de control antes de enviar información a nómina.'));
  el.appendChild(h('div', { class: 'toolbar' }, field('Entidad', entitySel)));
  el.appendChild(tableWrap);
  await load();
}
