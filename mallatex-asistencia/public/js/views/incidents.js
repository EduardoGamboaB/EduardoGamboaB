import { api } from '../api.js';
import { h, clear, fmtDate, stateBadge, modal, field, toast, empty, confirmDialog } from '../ui.js';
import { can } from '../state.js';

const TYPES = [
  ['vacaciones', 'Vacaciones'],
  ['permiso_goce', 'Permiso con goce'],
  ['permiso_singoce', 'Permiso sin goce'],
  ['incapacidad', 'Incapacidad'],
  ['falta_justificada', 'Falta justificada'],
  ['festivo', 'Día festivo'],
  ['descanso', 'Descanso'],
];
const TYPE_LABEL = Object.fromEntries(TYPES);
let statusFilter = '';

export default async function incidents(el) {
  clear(el);
  const employees = await api.get('/employees?active=true');

  const statusSel = h('select', {},
    h('option', { value: '' }, 'Todos los estados'),
    h('option', { value: 'pendiente' }, 'Pendientes'),
    h('option', { value: 'autorizada' }, 'Autorizadas'),
    h('option', { value: 'rechazada' }, 'Rechazadas'),
  );
  statusSel.value = statusFilter;
  const tableWrap = h('div', { class: 'card' });

  async function load() {
    statusFilter = statusSel.value;
    const items = await api.get('/incidents' + (statusFilter ? `?status=${statusFilter}` : ''));
    render(items);
  }

  function render(items) {
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Incidencias'), h('span', { class: 'sub' }, `${items.length} registro(s)`)));
    if (!items.length) { tableWrap.appendChild(empty('⚑', 'No hay incidencias registradas.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Empleado'), h('th', {}, 'Tipo'), h('th', {}, 'Periodo'), h('th', {}, 'Motivo'),
        h('th', {}, 'Estado'), h('th', {}, 'Autoriza'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((i) => row(i))),
    )));
  }

  function row(i) {
    const actions = [];
    if (i.status === 'pendiente') {
      if (can('admin', 'contador')) {
        actions.push(h('button', { class: 'btn btn-sm btn-primary', onClick: async () => {
          try { await api.post(`/incidents/${i.id}/authorize`); toast('Incidencia autorizada', 'ok'); refresh(); } catch (e) { toast(e.message, 'err'); }
        } }, 'Autorizar'));
        actions.push(h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
          const reason = prompt('Motivo del rechazo:'); if (reason == null) return;
          try { await api.post(`/incidents/${i.id}/reject`, { reason }); toast('Incidencia rechazada', 'warn'); refresh(); } catch (e) { toast(e.message, 'err'); }
        } }, 'Rechazar'));
      }
      actions.push(h('button', { class: 'btn btn-sm', onClick: async () => {
        if (await confirmDialog({ title: 'Eliminar incidencia', message: '¿Eliminar esta incidencia?', confirmText: 'Eliminar', danger: true })) {
          try { await api.del(`/incidents/${i.id}`); toast('Eliminada', 'ok'); refresh(); } catch (e) { toast(e.message, 'err'); }
        }
      } }, '✕'));
    }
    return h('tr', {},
      h('td', { class: 'strong' }, i.employeeName || '—'),
      h('td', {}, h('span', { class: 'badge b-purple' }, TYPE_LABEL[i.type] || i.type)),
      h('td', { class: 'mono' }, `${fmtDate(i.startDate, { day: '2-digit', month: 'short' })} – ${fmtDate(i.endDate, { day: '2-digit', month: 'short' })}`),
      h('td', { class: 'muted' }, i.reason || '—'),
      h('td', {}, stateBadge(i.status)),
      h('td', { class: 'muted', style: 'font-size:12px' }, i.authorizedBy || (i.createdBy ? `alta: ${i.createdBy}` : '—')),
      h('td', {}, h('div', { class: 'row', style: 'gap:6px' }, ...actions)),
    );
  }

  function refresh() { load(); window.dispatchEvent(new Event('mtx:refresh')); }

  statusSel.addEventListener('change', load);

  el.appendChild(h('div', { class: 'toolbar' },
    field('Estado', statusSel),
    h('div', { class: 'grow' }),
    can('admin', 'contador', 'nomina') ? h('button', { class: 'btn btn-primary', onClick: () => newModal(employees, refresh) }, '+ Nueva incidencia') : null,
  ));
  el.appendChild(tableWrap);
  await load();
}

function newModal(employees, onDone) {
  const empSel = h('select', {}, h('option', { value: '' }, 'Selecciona…'), ...employees.map((e) => h('option', { value: e.id }, `${e.code} · ${e.name}`)));
  const typeSel = h('select', {}, ...TYPES.map(([v, l]) => h('option', { value: v }, l)));
  const start = h('input', { type: 'date' });
  const end = h('input', { type: 'date' });
  const reason = h('textarea', { rows: '2', placeholder: 'Motivo / observaciones' });
  const m = modal({
    title: 'Nueva incidencia',
    body: h('div', { class: 'form-grid' },
      field('Empleado', empSel),
      h('div', { class: 'form-grid two' }, field('Tipo', typeSel), field('', h('div'))),
      h('div', { class: 'form-grid two' }, field('Desde', start), field('Hasta', end)),
      field('Motivo', reason),
      h('div', { class: 'note-box' }, 'La incidencia queda en estado “pendiente” hasta que Contabilidad la autorice; sólo entonces se refleja en la asistencia.'),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!empSel.value || !start.value || !end.value) return toast('Empleado y fechas son obligatorios', 'err');
        try {
          await api.post('/incidents', { employeeId: Number(empSel.value), type: typeSel.value, startDate: start.value, endDate: end.value, reason: reason.value.trim() });
          toast('Incidencia registrada', 'ok'); m.close(); onDone();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Registrar'),
    ],
  });
}
