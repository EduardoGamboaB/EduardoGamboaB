import { api } from '../../api.js';
import { h, clear, fmtDateTime, modal, field, toast, empty } from '../../ui.js';

const CATS = ['General', 'Nómina', 'Recursos Humanos', 'Sistemas', 'Asistencia'];
export function ticketBadge(s) {
  const map = { abierto: ['b-warn', 'Abierto'], en_proceso: ['b-info', 'En proceso'], resuelto: ['b-ok', 'Resuelto'] };
  const [cls, label] = map[s] || ['b-gray', s];
  return h('span', { class: `badge ${cls}` }, label);
}

export function threadNode(t) {
  return h('div', { class: 'grid', style: 'gap:10px' }, ...t.messages.map((mm) => h('div', {
    class: 'card card-pad', style: `border-left:3px solid ${mm.role === 'rh' ? 'var(--info)' : 'var(--accent)'}`,
  },
    h('div', { class: 'row spread' }, h('strong', {}, mm.by + (mm.role === 'rh' ? ' · RH' : '')), h('span', { class: 'muted', style: 'font-size:11px' }, fmtDateTime(mm.at))),
    h('div', { class: 'mt', style: 'font-size:13px' }, mm.message))));
}

export default async function misTickets(el) {
  clear(el);
  const tableWrap = h('div', { class: 'card' });
  el.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'grow' }, h('div', { class: 'muted' }, 'Envía solicitudes o dudas a Recursos Humanos y da seguimiento a las respuestas.')),
    h('button', { class: 'btn btn-primary', onClick: () => newTicket(load) }, '+ Nuevo ticket')));
  el.appendChild(tableWrap);

  async function load() {
    const items = await api.get('/portal/me/tickets');
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Mis tickets'), h('span', { class: 'sub' }, `${items.length} ticket(s)`)));
    if (!items.length) { tableWrap.appendChild(empty('🎫', 'No tienes tickets.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Asunto'), h('th', {}, 'Categoría'), h('th', {}, 'Estado'), h('th', {}, 'Actualizado'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((t) => h('tr', {},
        h('td', { class: 'strong' }, t.subject),
        h('td', { class: 'muted' }, t.category),
        h('td', {}, ticketBadge(t.status)),
        h('td', { class: 'muted', style: 'font-size:12px' }, fmtDateTime(t.messages[t.messages.length - 1].at)),
        h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => openThread(t, load) }, 'Abrir'))))))));
  }
  await load();
}

function newTicket(onDone) {
  const cat = h('select', {}, ...CATS.map((c) => h('option', { value: c }, c)));
  const subject = h('input', { placeholder: 'Asunto' });
  const message = h('textarea', { rows: '3', placeholder: 'Describe tu solicitud' });
  const m = modal({ title: 'Nuevo ticket', body: h('div', { class: 'form-grid' }, field('Categoría', cat), field('Asunto', subject), field('Mensaje', message)),
    footer: [h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!subject.value || !message.value) return toast('Asunto y mensaje son obligatorios', 'err');
        try { await api.post('/portal/me/tickets', { category: cat.value, subject: subject.value, message: message.value }); toast('Ticket enviado', 'ok'); m.close(); onDone(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Enviar')] });
}

function openThread(t, onDone) {
  const reply = h('textarea', { rows: '2', placeholder: 'Escribe una respuesta…' });
  const m = modal({ title: t.subject, size: 'lg',
    body: h('div', {}, h('div', { class: 'row', style: 'gap:8px;margin-bottom:10px' }, ticketBadge(t.status), h('span', { class: 'badge b-gray' }, t.category)),
      threadNode(t), h('div', { class: 'mt' }, field('Responder', reply))),
    footer: [h('button', { class: 'btn', onClick: () => m.close() }, 'Cerrar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!reply.value.trim()) return toast('Escribe una respuesta', 'err');
        try { await api.post(`/portal/me/tickets/${t.id}/reply`, { message: reply.value.trim() }); toast('Respuesta enviada', 'ok'); m.close(); onDone(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Responder')] });
}
