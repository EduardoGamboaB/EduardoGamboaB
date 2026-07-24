import { api } from '../../api.js';
import { h, clear, fmtDateTime, modal, field, toast, empty } from '../../ui.js';
import { ticketBadge, threadNode } from '../portal/tickets.js';

let statusFilter = '';

export default async function rhTickets(el) {
  clear(el);
  const statusSel = h('select', {}, h('option', { value: '' }, 'Todos'), h('option', { value: 'abierto' }, 'Abiertos'), h('option', { value: 'en_proceso' }, 'En proceso'), h('option', { value: 'resuelto' }, 'Resueltos'));
  statusSel.value = statusFilter;
  const tableWrap = h('div', { class: 'card' });

  async function load() {
    statusFilter = statusSel.value;
    const items = await api.get('/rh/tickets' + (statusFilter ? `?status=${statusFilter}` : ''));
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Tickets de Recursos Humanos'), h('span', { class: 'sub' }, `${items.length} ticket(s)`)));
    if (!items.length) { tableWrap.appendChild(empty('🎫', 'Sin tickets.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Empleado'), h('th', {}, 'Asunto'), h('th', {}, 'Categoría'), h('th', {}, 'Estado'), h('th', {}, 'Actualizado'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((t) => h('tr', {},
        h('td', { class: 'strong' }, t.employeeName),
        h('td', {}, t.subject),
        h('td', { class: 'muted' }, t.category),
        h('td', {}, ticketBadge(t.status)),
        h('td', { class: 'muted', style: 'font-size:12px' }, fmtDateTime(t.messages[t.messages.length - 1].at)),
        h('td', {}, h('button', { class: 'btn btn-sm btn-primary', onClick: () => manage(t, load) }, 'Atender'))))))));
  }

  statusSel.addEventListener('change', load);
  el.appendChild(h('div', { class: 'toolbar' }, field('Estado', statusSel)));
  el.appendChild(tableWrap);
  await load();
}

function manage(t, onDone) {
  const reply = h('textarea', { rows: '2', placeholder: 'Responder al colaborador…' });
  const statusSel = h('select', {}, ...[['abierto', 'Abierto'], ['en_proceso', 'En proceso'], ['resuelto', 'Resuelto']].map(([v, l]) => { const o = h('option', { value: v }, l); if (t.status === v) o.selected = true; return o; }));
  const m = modal({ title: `${t.subject} · ${t.employeeName}`, size: 'lg',
    body: h('div', {}, h('div', { class: 'row', style: 'gap:8px;margin-bottom:10px' }, ticketBadge(t.status), h('span', { class: 'badge b-gray' }, t.category)),
      threadNode(t),
      h('div', { class: 'form-grid mt' }, field('Respuesta', reply), field('Cambiar estado', statusSel))),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cerrar'),
      h('button', { class: 'btn btn-dark', onClick: async () => {
        try { await api.put(`/rh/tickets/${t.id}`, { status: statusSel.value }); toast('Estado actualizado', 'ok'); m.close(); onDone(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Sólo cambiar estado'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!reply.value.trim()) return toast('Escribe una respuesta', 'err');
        try { await api.post(`/rh/tickets/${t.id}/reply`, { message: reply.value.trim(), status: statusSel.value }); toast('Respuesta enviada', 'ok'); m.close(); onDone(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Responder'),
    ] });
}
