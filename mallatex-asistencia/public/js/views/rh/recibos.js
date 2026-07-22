import { api } from '../../api.js';
import { h, clear, fmtDate, money, modal, empty, toast, confirmDialog } from '../../ui.js';
import { currentPeriod, can } from '../../state.js';
import { payslipNode, downloadPayslip } from './payslip.js';

export default async function rhRecibos(el) {
  clear(el);
  const period = currentPeriod();
  const tableWrap = h('div', { class: 'card' });

  const genBtn = h('button', { class: 'btn btn-primary', onClick: async () => {
    if (!period) return;
    if (period.status !== 'cerrado' && !await confirmDialog({ title: 'Periodo abierto', message: 'El periodo aún no está cerrado; los recibos serán preliminares. ¿Generar de todas formas?', confirmText: 'Generar' })) return;
    genBtn.disabled = true; genBtn.textContent = 'Generando…';
    try { const r = await api.post('/rh/payslips/generate', { periodId: period.id }); toast(`${r.count} recibos generados`, 'ok'); await load(); }
    catch (e) { toast(e.message, 'err'); }
    genBtn.disabled = false; genBtn.textContent = '↻ Generar recibos del periodo';
  } }, '↻ Generar recibos del periodo');

  el.appendChild(h('div', { class: 'note-box mb' }, 'Los recibos se calculan a partir de la asistencia, incidencias, tiempo extra y bono del periodo. Son preliminares: el cálculo fiscal definitivo (ISR/IMSS) se realiza en Aspel NOI.'));
  el.appendChild(h('div', { class: 'toolbar' }, h('div', { class: 'grow' }, h('div', { class: 'muted' }, `Periodo: ${period ? period.name + ' · ' + period.status : '—'}`)), can('admin', 'contador', 'nomina') ? genBtn : null));
  el.appendChild(tableWrap);

  async function load() {
    const items = await api.get('/rh/payslips' + (period ? `?periodId=${period.id}` : ''));
    clear(tableWrap);
    const totalNeto = items.reduce((s, p) => s + (p.neto || 0), 0);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Recibos del periodo'), h('span', { class: 'sub' }, `${items.length} · neto total ${money(totalNeto)}`)));
    if (!items.length) { tableWrap.appendChild(empty('🧾', 'Aún no se han generado recibos para este periodo.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Empleado'), h('th', {}, 'Área'), h('th', { class: 'num' }, 'Percep.'), h('th', { class: 'num' }, 'Deduc.'), h('th', { class: 'num' }, 'Neto'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((p) => h('tr', {},
        h('td', {}, h('div', { class: 'strong' }, p.employeeName), h('div', { class: 'muted', style: 'font-size:11px' }, p.employeeCode)),
        h('td', { class: 'muted' }, p.department || '—'),
        h('td', { class: 'num mono' }, money(p.totalP)),
        h('td', { class: 'num mono' }, money(p.totalD)),
        h('td', { class: 'num mono strong' }, money(p.neto)),
        h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => openReceipt(p.id) }, 'Ver')))),
      ),
      h('tfoot', {}, h('tr', {}, h('td', { colspan: '4', class: 'num strong' }, 'Neto total'), h('td', { class: 'num strong mono' }, money(totalNeto)), h('td', {}))),
    )));
  }
  await load();
}

async function openReceipt(id) {
  try {
    const p = await api.get(`/rh/payslips/${id}`);
    modal({ title: `Recibo · ${p.employeeName}`, size: 'lg', body: payslipNode(p),
      footer: [h('button', { class: 'btn btn-primary', onClick: () => downloadPayslip(p) }, '⬇ Descargar')] });
  } catch (e) { toast(e.message, 'err'); }
}
