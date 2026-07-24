import { api } from '../../api.js';
import { h, clear, fmtDate, money, modal, empty, toast } from '../../ui.js';
import { payslipNode, downloadPayslip } from '../rh/payslip.js';

export default async function misRecibos(el) {
  clear(el);
  const items = await api.get('/portal/me/payslips');
  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Mis recibos'), h('span', { class: 'sub' }, `${items.length} recibo(s)`)));
  if (!items.length) { card.appendChild(empty('🧾', 'Aún no hay recibos emitidos.')); el.appendChild(card); return; }
  card.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Periodo'), h('th', { class: 'num' }, 'Percepciones'), h('th', { class: 'num' }, 'Deducciones'), h('th', { class: 'num' }, 'Neto'), h('th', {}, ''))),
    h('tbody', {}, ...items.map((p) => h('tr', {},
      h('td', {}, h('div', { class: 'strong' }, p.periodName), h('div', { class: 'muted', style: 'font-size:11px' }, `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`)),
      h('td', { class: 'num mono' }, money(p.totalP)),
      h('td', { class: 'num mono' }, money(p.totalD)),
      h('td', { class: 'num mono strong' }, money(p.neto)),
      h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => openReceipt(p.id) }, 'Ver'))))))));
  el.appendChild(card);
}

async function openReceipt(id) {
  try {
    const p = await api.get(`/portal/me/payslips/${id}`);
    modal({ title: `Recibo · ${p.periodName}`, size: 'lg', body: payslipNode(p),
      footer: [h('button', { class: 'btn btn-primary', onClick: () => downloadPayslip(p) }, '⬇ Descargar')] });
  } catch (e) { toast(e.message, 'err'); }
}
