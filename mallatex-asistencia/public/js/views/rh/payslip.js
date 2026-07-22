// Render y descarga de un recibo preliminar (compartido portal/RH).
import { h, money, fmtDate } from '../../ui.js';

export function payslipNode(p) {
  const line = (arr) => arr.map((x) => h('tr', {},
    h('td', {}, x.concepto + (x.dias ? ` (${x.dias} día/s)` : x.horas ? ` (${x.horas} h)` : '')),
    h('td', { class: 'num mono' }, money(x.importe))));
  return h('div', {},
    h('div', { class: 'row spread', style: 'align-items:flex-start' },
      h('div', {}, h('div', { class: 'strong', style: 'font-size:15px' }, p.employeeName), h('div', { class: 'muted' }, `${p.employeeCode} · ${p.department || ''}`)),
      h('div', { style: 'text-align:right' }, h('div', { class: 'strong' }, p.periodName), h('div', { class: 'muted', style: 'font-size:12px' }, `${fmtDate(p.periodStart)} – ${fmtDate(p.periodEnd)}`))),
    h('div', { class: 'grid grid-2 mt', style: 'gap:16px' },
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', { style: 'color:var(--ok)' }, 'Percepciones')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('tbody', {}, ...line(p.perceptions),
          h('tr', {}, h('td', { class: 'strong' }, 'Total percepciones'), h('td', { class: 'num strong mono' }, money(p.totalP))))))),
      h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', { style: 'color:var(--err)' }, 'Deducciones')),
        h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('tbody', {}, ...(p.deductions.length ? line(p.deductions) : [h('tr', {}, h('td', { class: 'muted' }, 'Sin deducciones'), h('td', {}))]),
          h('tr', {}, h('td', { class: 'strong' }, 'Total deducciones'), h('td', { class: 'num strong mono' }, money(p.totalD))))))),
    ),
    h('div', { class: 'card card-pad mt', style: 'display:flex;justify-content:space-between;align-items:center' },
      h('span', { class: 'strong', style: 'font-size:15px' }, 'Neto a pagar'),
      h('span', { class: 'strong mono', style: 'font-size:22px;color:var(--accent)' }, money(p.neto))),
    h('div', { class: 'note-box mt' }, 'Recibo preliminar/informativo. El cálculo fiscal definitivo (ISR/IMSS) se genera en Aspel NOI.'),
  );
}

export function downloadPayslip(p) {
  const L = [];
  L.push(`RECIBO PRELIMINAR — MALLATEX`);
  L.push(`${p.periodName}  (${p.periodStart} a ${p.periodEnd})`);
  L.push(`Empleado: ${p.employeeName}  Clave: ${p.employeeCode}  Área: ${p.department || ''}`);
  L.push('');
  L.push('PERCEPCIONES');
  p.perceptions.forEach((x) => L.push(`  ${x.concepto.padEnd(28)} ${String(money(x.importe)).padStart(14)}`));
  L.push(`  ${'TOTAL PERCEPCIONES'.padEnd(28)} ${String(money(p.totalP)).padStart(14)}`);
  L.push('');
  L.push('DEDUCCIONES');
  if (p.deductions.length) p.deductions.forEach((x) => L.push(`  ${x.concepto.padEnd(28)} ${String(money(x.importe)).padStart(14)}`));
  else L.push('  (sin deducciones)');
  L.push(`  ${'TOTAL DEDUCCIONES'.padEnd(28)} ${String(money(p.totalD)).padStart(14)}`);
  L.push('');
  L.push(`  ${'NETO A PAGAR'.padEnd(28)} ${String(money(p.neto)).padStart(14)}`);
  L.push('');
  L.push('Recibo preliminar/informativo. El cálculo fiscal definitivo se genera en Aspel NOI.');
  const blob = new Blob([L.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Recibo_${p.employeeCode}_${p.periodName.replace(/[^\w]+/g, '_')}.txt`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
