import { api } from '../api.js';
import { h, clear, fmtDate, stateBadge, field, toast, empty } from '../ui.js';
import { currentPeriod, can } from '../state.js';

let statusFilter = 'pendiente';

export default async function overtime(el) {
  clear(el);
  const period = currentPeriod();

  const statusSel = h('select', {},
    h('option', { value: '' }, 'Todos'),
    h('option', { value: 'pendiente' }, 'Pendientes'),
    h('option', { value: 'autorizada' }, 'Autorizadas'),
    h('option', { value: 'rechazada' }, 'Rechazadas'),
  );
  statusSel.value = statusFilter;
  const startInput = h('input', { type: 'date', value: period?.startDate || '2026-07-01' });
  const endInput = h('input', { type: 'date', value: period?.endDate || '2026-07-31' });
  const tableWrap = h('div', { class: 'card' });

  async function load() {
    statusFilter = statusSel.value;
    const params = new URLSearchParams({ start: startInput.value, end: endInput.value });
    if (statusFilter) params.set('status', statusFilter);
    const items = await api.get('/overtime?' + params.toString());
    render(items);
  }

  function render(items) {
    clear(tableWrap);
    const totalAuth = items.filter((o) => o.status === 'autorizada').reduce((s, o) => s + (o.authorizedMinutes || 0), 0);
    tableWrap.appendChild(h('div', { class: 'card-head' },
      h('h2', {}, 'Tiempo extra'),
      h('span', { class: 'sub' }, `${items.length} registro(s) · ${(totalAuth / 60).toFixed(1)} h autorizadas`)));
    if (!items.length) { tableWrap.appendChild(empty('⏱', 'Sin registros de tiempo extra.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Empleado'), h('th', {}, 'Fecha'), h('th', { class: 'num' }, 'Calculado'),
        h('th', {}, 'Autorizar (h)'), h('th', {}, 'Tipo'), h('th', {}, 'Estado'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((o) => row(o))),
    )));
  }

  function row(o) {
    const editable = o.status === 'pendiente' && can('admin', 'contador', 'nomina');
    const hoursInput = h('input', { type: 'number', min: '0', step: '0.25', style: 'width:90px',
      value: ((o.authorizedMinutes || o.calculatedMinutes) / 60).toFixed(2) });
    const typeSel = h('select', { style: 'width:120px' },
      h('option', { value: 'ordinario' }, 'Ordinario'),
      h('option', { value: 'doble' }, 'Doble/Triple'));
    typeSel.value = o.type || 'ordinario';
    hoursInput.disabled = !editable; typeSel.disabled = !editable;

    const actions = [];
    if (editable) {
      actions.push(h('button', { class: 'btn btn-sm btn-primary', onClick: async () => {
        try {
          await api.post(`/overtime/${o.id}/authorize`, { authorizedMinutes: Math.round(Number(hoursInput.value) * 60), type: typeSel.value });
          toast('Tiempo extra autorizado', 'ok'); refresh();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Autorizar'));
      actions.push(h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
        try { await api.post(`/overtime/${o.id}/reject`); toast('Rechazado', 'warn'); refresh(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Rechazar'));
    }
    return h('tr', {},
      h('td', { class: 'strong' }, o.employeeName || '—'),
      h('td', { class: 'mono' }, fmtDate(o.date, { day: '2-digit', month: 'short' })),
      h('td', { class: 'num mono' }, (o.calculatedMinutes / 60).toFixed(2) + ' h'),
      h('td', {}, hoursInput),
      h('td', {}, typeSel),
      h('td', {}, stateBadge(o.status)),
      h('td', {}, h('div', { class: 'row', style: 'gap:6px' }, ...actions)),
    );
  }

  function refresh() { load(); window.dispatchEvent(new Event('mtx:refresh')); }

  [statusSel, startInput, endInput].forEach((n) => n.addEventListener('change', load));

  el.appendChild(h('div', { class: 'note-box mb' }, 'El tiempo extra se calcula preliminarmente a partir de las checadas y requiere revisión y autorización antes de exportarse a NOI.'));
  el.appendChild(h('div', { class: 'toolbar' }, field('Estado', statusSel), field('Desde', startInput), field('Hasta', endInput)));
  el.appendChild(tableWrap);
  await load();
}
