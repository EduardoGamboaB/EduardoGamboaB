import { api } from '../../api.js';
import { h, clear, modal, toast, empty, money, fmtDate } from '../../ui.js';
import { can } from '../../state.js';

const VIA_STATUS = { solicitado: ['b-warn', 'Solicitado'], aprobado: ['b-ok', 'Aprobado'], rechazado: ['b-gray', 'Rechazado'], comprobado: ['b-ok', 'Comprobado'] };
const GTO_STATUS = { pendiente: ['b-warn', 'Pendiente'], aprobado: ['b-ok', 'Aprobado'], rechazado: ['b-gray', 'Rechazado'] };
const CAT_LABEL = { hospedaje: 'Hospedaje', alimentos: 'Alimentos', combustible: 'Combustible', casetas: 'Casetas', transporte: 'Transporte', otros: 'Otros' };

let tab = 'viaticos';

export default async function administrativo(el) {
  clear(el);
  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, 'Administrativo de ventas'), h('div', { class: 'muted mt' }, 'Aprueba viáticos y revisa la comprobación de gastos del equipo')),
      h('div', { class: 'row', style: 'gap:6px' },
        tabBtn('viaticos', 'Viáticos'),
        tabBtn('gastos', 'Gastos'),
      ),
    ),
  ));
  const host = h('div', {});
  el.appendChild(host);
  if (tab === 'viaticos') await renderViaticos(host); else await renderGastos(host);
}

function tabBtn(key, label) {
  return h('button', { class: 'btn btn-sm' + (tab === key ? ' btn-primary' : ''), onClick: () => { tab = key; reload(); } }, label);
}

async function renderViaticos(host) {
  const items = await api.get('/crm/expense-requests');
  if (!items.length) return host.appendChild(empty('✈️', 'Sin solicitudes de viáticos.'));
  host.appendChild(h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Solicitudes de viáticos'), h('span', { class: 'sub' }, `${items.length} solicitud(es)`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Folio'), h('th', {}, 'Vendedor'), h('th', {}, 'Concepto'), h('th', {}, 'Destino'), h('th', { class: 'num' }, 'Monto'), h('th', {}, 'Estatus'), can('admin', 'contador') ? h('th', {}, '') : null)),
      h('tbody', {}, ...items.map((r) => {
        const [cls, label] = VIA_STATUS[r.status] || ['b-gray', r.status];
        return h('tr', {},
          h('td', { class: 'strong' }, r.folio),
          h('td', {}, r.employeeName),
          h('td', {}, r.concept),
          h('td', { class: 'muted' }, r.destination || '—'),
          h('td', { class: 'num mono' }, money(r.amount)),
          h('td', {}, h('span', { class: `badge ${cls}` }, label)),
          can('admin', 'contador') ? h('td', {}, r.status === 'solicitado'
            ? h('div', { class: 'row', style: 'gap:6px' },
                h('button', { class: 'btn btn-sm btn-primary', onClick: () => decide('/crm/expense-requests', r.id, 'aprobado') }, 'Aprobar'),
                h('button', { class: 'btn btn-sm', onClick: () => decide('/crm/expense-requests', r.id, 'rechazado') }, 'Rechazar'))
            : h('span', { class: 'muted' }, r.decidedBy ? `por ${r.decidedBy}` : '—')) : null,
        );
      })),
    )),
  ));
}

async function renderGastos(host) {
  const items = await api.get('/crm/expenses');
  if (!items.length) return host.appendChild(empty('🧾', 'Sin comprobaciones de gastos.'));
  const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);
  host.appendChild(h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Comprobación de gastos'), h('span', { class: 'sub' }, `${items.length} · ${money(total)}`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Folio'), h('th', {}, 'Vendedor'), h('th', {}, 'Categoría'), h('th', {}, 'Comercio'), h('th', {}, 'Fecha'), h('th', { class: 'num' }, 'Monto'), h('th', {}, 'Evidencia'), h('th', {}, 'Estatus'), can('admin', 'contador') ? h('th', {}, '') : null)),
      h('tbody', {}, ...items.map((e) => {
        const [cls, label] = GTO_STATUS[e.status] || ['b-gray', e.status];
        return h('tr', {},
          h('td', { class: 'strong' }, e.folio),
          h('td', {}, e.employeeName),
          h('td', {}, CAT_LABEL[e.category] || e.category),
          h('td', { class: 'muted' }, e.merchant || '—'),
          h('td', { class: 'muted' }, fmtDate(e.date)),
          h('td', { class: 'num mono' }, money(e.amount)),
          h('td', {}, e.hasPhoto ? h('button', { class: 'btn btn-sm', onClick: () => verEvidencia(e) }, '📷 Ver') : h('span', { class: 'muted' }, e.hasInvoice ? 'Factura' : '—')),
          h('td', {}, h('span', { class: `badge ${cls}` }, label)),
          can('admin', 'contador') ? h('td', {}, e.status === 'pendiente'
            ? h('div', { class: 'row', style: 'gap:6px' },
                h('button', { class: 'btn btn-sm btn-primary', onClick: () => decide('/crm/expenses', e.id, 'aprobado') }, 'Aprobar'),
                h('button', { class: 'btn btn-sm', onClick: () => decide('/crm/expenses', e.id, 'rechazado') }, 'Rechazar'))
            : h('span', { class: 'muted' }, '—')) : null,
        );
      })),
    )),
  ));
}

async function verEvidencia(e) {
  let src = '';
  try { const r = await api.get(`/crm/expenses/${e.id}/photo`); src = r.photo || ''; } catch { return toast('Sin evidencia', 'err'); }
  const m = modal({
    title: `Evidencia · ${e.folio}`,
    body: h('div', { style: 'text-align:center' }, src ? h('img', { src, style: 'max-width:100%;border-radius:8px' }) : empty('🖼️', 'Sin imagen')),
    footer: [h('button', { class: 'btn', onClick: () => m.close() }, 'Cerrar')],
  });
}

async function decide(base, id, decision) {
  try { await api.post(`${base}/${id}/decision`, { decision }); toast(decision === 'aprobado' ? 'Aprobado' : 'Rechazado', 'ok'); reload(); }
  catch (e) { toast(e.message, 'err'); }
}

function reload() { import('../../router.js').then((r) => r.render()); }
