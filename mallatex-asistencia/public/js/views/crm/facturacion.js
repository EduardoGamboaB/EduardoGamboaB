import { api } from '../../api.js';
import { h, clear, modal, field, toast, empty, money, fmtDate } from '../../ui.js';
import { can } from '../../state.js';

const STATUS = { solicitada: ['b-warn', 'Solicitada'], emitida: ['b-ok', 'Emitida'], pagada: ['b-ok', 'Pagada'], cancelada: ['b-gray', 'Cancelada'] };

export default async function facturacion(el) {
  clear(el);
  const items = await api.get('/crm/invoices');
  const pend = items.filter((i) => i.status === 'solicitada').length;
  const emit = items.filter((i) => i.status === 'emitida').reduce((s, i) => s + Number(i.amount || 0), 0);

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, 'Facturación'), h('div', { class: 'muted mt' }, `${pend} por emitir · ${money(emit)} emitido · integración Aspel`)),
    ),
  ));

  if (!items.length) return el.appendChild(empty('📑', 'Sin solicitudes de factura.'));

  el.appendChild(h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Solicitudes de factura'), h('span', { class: 'sub' }, `${items.length} registro(s)`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Folio'), h('th', {}, 'Cliente'), h('th', {}, 'RFC'), h('th', {}, 'Uso'), h('th', {}, 'Vendedor'), h('th', {}, 'Fecha'), h('th', { class: 'num' }, 'Importe'), h('th', {}, 'Estatus'), h('th', {}, 'UUID'), can('admin', 'contador') ? h('th', {}, '') : null)),
      h('tbody', {}, ...items.map((i) => {
        const [cls, label] = STATUS[i.status] || ['b-gray', i.status];
        return h('tr', {},
          h('td', { class: 'strong' }, i.folio),
          h('td', {}, i.clientName || i.razonSocial || '—'),
          h('td', { class: 'mono' }, i.rfc),
          h('td', { class: 'muted' }, i.usoCfdi),
          h('td', { class: 'muted' }, i.employeeName),
          h('td', { class: 'muted' }, fmtDate(i.createdAt?.slice(0, 10))),
          h('td', { class: 'num mono' }, money(i.amount)),
          h('td', {}, h('span', { class: `badge ${cls}` }, label)),
          h('td', { class: 'muted mono', style: 'font-size:11px' }, i.uuid || '—'),
          can('admin', 'contador') ? h('td', {}, i.status === 'solicitada'
            ? h('div', { class: 'row', style: 'gap:6px' },
                h('button', { class: 'btn btn-sm btn-primary', onClick: () => emitir(i) }, 'Emitir'),
                h('button', { class: 'btn btn-sm', onClick: () => cancelar(i) }, 'Cancelar'))
            : h('span', { class: 'muted' }, i.emittedBy ? `por ${i.emittedBy}` : '—')) : null,
        );
      })),
    )),
  ));
}

function emitir(i) {
  const uuid = h('input', { placeholder: 'Se genera automático si se deja vacío' });
  const m = modal({
    title: `Emitir factura · ${i.folio}`,
    body: h('div', { class: 'form-grid' },
      h('div', { class: 'muted' }, `${i.clientName || i.razonSocial} · RFC ${i.rfc} · ${money(i.amount)}`),
      field('UUID (timbrado Aspel)', uuid, 'En la integración se recibe del PAC; puedes capturarlo manualmente.'),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        try { await api.post(`/crm/invoices/${i.id}/emit`, { uuid: uuid.value || undefined }); toast('Factura emitida', 'ok'); m.close(); reload(); }
        catch (e) { toast(e.message, 'err'); }
      } }, 'Emitir CFDI'),
    ],
  });
}

async function cancelar(i) {
  try { await api.post(`/crm/invoices/${i.id}/cancel`, {}); toast('Factura cancelada', 'ok'); reload(); }
  catch (e) { toast(e.message, 'err'); }
}

function reload() { import('../../router.js').then((r) => r.render()); }
