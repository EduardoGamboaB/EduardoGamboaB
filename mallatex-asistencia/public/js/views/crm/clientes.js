import { api } from '../../api.js';
import { h, clear, modal, field, toast, empty, fmtDate } from '../../ui.js';
import { can } from '../../state.js';

const STAGE = { prospecto: ['b-warn', 'Prospecto'], negociacion: ['b-ok', 'Negociación'], cliente: ['b-ok', 'Cliente'] };

export default async function clientes(el) {
  clear(el);
  const [clients, employees] = await Promise.all([api.get('/crm/clients'), api.get('/employees?active=true')]);
  const vendors = employees.filter((e) => (e.department || '').toLowerCase().includes('venta') || (e.position || '').toLowerCase().includes('vend')) ;
  const vendorList = vendors.length ? vendors : employees;

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, 'Cartera de clientes'), h('div', { class: 'muted mt' }, `${clients.length} clientes/prospectos · asigna la cartera a cada vendedor`)),
      can('admin', 'contador', 'comercial') ? h('button', { class: 'btn btn-primary', onClick: () => clientModal(null, vendorList) }, '+ Cliente') : null,
    ),
  ));

  const byV = {};
  for (const c of clients) { const k = c.assignedToName || 'Sin asignar'; (byV[k] ||= []).push(c); }

  const table = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Clientes'), h('span', { class: 'sub' }, `${clients.length} registros`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Cliente'), h('th', {}, 'Tipo'), h('th', {}, 'Etapa'), h('th', {}, 'Cultivo'), h('th', {}, 'Vendedor'), h('th', {}, 'Contacto'), can('admin', 'contador', 'comercial') ? h('th', {}, '') : null)),
      h('tbody', {}, ...clients.map((c) => {
        const [cls, label] = STAGE[c.stage] || ['b-gray', c.stage || '—'];
        return h('tr', {},
          h('td', { class: 'strong' }, c.name),
          h('td', {}, c.type === 'prospecto' ? 'Prospecto' : 'Cliente'),
          h('td', {}, h('span', { class: `badge ${cls}` }, label)),
          h('td', { class: 'muted' }, c.cultivo || '—'),
          h('td', {}, c.assignedToName || h('span', { class: 'muted' }, 'Sin asignar')),
          h('td', { class: 'muted' }, [c.contactName, c.phone].filter(Boolean).join(' · ') || '—'),
          can('admin', 'contador', 'comercial') ? h('td', {}, h('div', { class: 'row', style: 'gap:6px' },
            h('button', { class: 'btn btn-sm', onClick: () => clientModal(c, vendorList) }, 'Editar'),
            h('button', { class: 'btn btn-sm', onClick: () => seguimiento(c) }, 'Seguimiento'),
          )) : null,
        );
      })),
    )),
  );
  el.appendChild(table);
  if (!clients.length) { clear(el).appendChild(empty('👥', 'Aún no hay clientes. Usa “+ Cliente”.')); }
}

function clientModal(c, vendors) {
  const name = h('input', { value: c?.name || '', placeholder: 'Nombre / empresa' });
  const type = h('select', {}, ...[['cliente', 'Cliente'], ['prospecto', 'Prospecto']].map(([v, l]) => opt(v, l, (c?.type || 'cliente') === v)));
  const stage = h('select', {}, ...[['prospecto', 'Prospecto'], ['negociacion', 'Negociación'], ['cliente', 'Cliente']].map(([v, l]) => opt(v, l, (c?.stage || 'cliente') === v)));
  const cultivo = h('input', { value: c?.cultivo || '', placeholder: 'p. ej. Tomate' });
  const contactName = h('input', { value: c?.contactName || '' });
  const phone = h('input', { value: c?.phone || '' });
  const assignedTo = h('select', {}, opt('', 'Sin asignar', !c?.assignedTo), ...vendors.map((v) => opt(v.id, `${v.code} · ${v.name}`, c?.assignedTo === v.id)));
  const m = modal({
    title: c ? `Cliente · ${c.name}` : 'Nuevo cliente',
    body: h('div', { class: 'form-grid' },
      field('Nombre', name),
      h('div', { class: 'form-grid two' }, field('Tipo', type), field('Etapa', stage)),
      field('Cultivo', cultivo),
      h('div', { class: 'form-grid two' }, field('Contacto', contactName), field('Teléfono', phone)),
      field('Vendedor asignado', assignedTo),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!name.value) return toast('El nombre es obligatorio', 'err');
        const body = { name: name.value, type: type.value, stage: stage.value, cultivo: cultivo.value, contactName: contactName.value, phone: phone.value, assignedTo: assignedTo.value || null };
        try { if (c) await api.put(`/crm/clients/${c.id}`, body); else await api.post('/crm/clients', body); toast('Cliente guardado', 'ok'); m.close(); reload(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
  });
}

async function seguimiento(c) {
  let visits = [];
  try { visits = await api.get(`/crm/clients/${c.id}/visits`); } catch {}
  const m = modal({
    title: `Seguimiento · ${c.name}`,
    body: h('div', {},
      visits.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Tipo'), h('th', {}, 'Estatus'), h('th', {}, 'Evidencia'))),
        h('tbody', {}, ...visits.map((v) => h('tr', {},
          h('td', {}, fmtDate(v.timestamp?.slice(0, 10))),
          h('td', { style: 'text-transform:capitalize' }, v.type),
          h('td', {}, v.status),
          h('td', { class: 'muted' }, `${v.photoCount || 0} foto(s)`),
        ))),
      )) : empty('🗺️', 'Sin visitas registradas por el vendedor.'),
    ),
    footer: [h('button', { class: 'btn', onClick: () => m.close() }, 'Cerrar')],
  });
}

function opt(value, label, selected) { const o = h('option', { value }, label); if (selected) o.selected = true; return o; }
function reload() { import('../../router.js').then((r) => r.render()); }
