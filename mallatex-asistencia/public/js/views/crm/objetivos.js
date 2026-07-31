import { api } from '../../api.js';
import { h, clear, modal, field, toast, empty, money } from '../../ui.js';
import { can } from '../../state.js';

export default async function objetivos(el) {
  clear(el);
  const [objs, employees] = await Promise.all([api.get('/crm/objectives'), api.get('/employees?active=true')]);
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const vendors = employees.filter((e) => (e.department || '').toLowerCase().includes('venta')) ;
  const vendorList = vendors.length ? vendors : employees;

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, 'Objetivos de venta'), h('div', { class: 'muted mt' }, 'Meta por vendedor y trimestre')),
      can('admin', 'contador', 'comercial') ? h('button', { class: 'btn btn-primary', onClick: () => objModal(null, vendorList) }, '+ Objetivo') : null,
    ),
  ));

  el.appendChild(h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Metas'), h('span', { class: 'sub' }, `${objs.length} objetivo(s)`)),
    objs.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Vendedor'), h('th', {}, 'Periodo'), h('th', { class: 'num' }, 'Meta'), h('th', { class: 'num' }, 'Alcanzado'), h('th', {}, 'Avance'), can('admin', 'contador', 'comercial') ? h('th', {}, '') : null)),
      h('tbody', {}, ...objs.map((o) => {
        const pct = o.targetAmount ? Math.min(100, Math.round((o.achievedAmount / o.targetAmount) * 100)) : 0;
        return h('tr', {},
          h('td', { class: 'strong' }, empById[o.employeeId]?.name || `#${o.employeeId}`),
          h('td', {}, o.period),
          h('td', { class: 'num mono' }, money(o.targetAmount)),
          h('td', { class: 'num mono' }, money(o.achievedAmount)),
          h('td', {}, h('div', { style: 'display:flex;align-items:center;gap:8px' },
            h('div', { style: 'flex:1;height:8px;background:var(--line-2);border-radius:4px;overflow:hidden;min-width:80px' },
              h('div', { style: `height:8px;width:${pct}%;background:${pct >= 100 ? 'var(--ok)' : 'var(--accent)'}` })),
            h('span', { class: 'mono', style: 'font-size:12px' }, pct + '%'))),
          can('admin', 'contador', 'comercial') ? h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => objModal(o, vendorList) }, 'Editar')) : null,
        );
      })),
    )) : empty('🎯', 'Sin objetivos. Usa “+ Objetivo”.'),
  ));
}

function objModal(o, vendors) {
  const emp = h('select', {}, ...vendors.map((v) => opt(v.id, `${v.code} · ${v.name}`, o?.employeeId === v.id)));
  const period = h('input', { value: o?.period || 'Q3-2026', placeholder: 'Q3-2026' });
  const target = h('input', { type: 'number', value: o?.targetAmount ?? '' });
  const achieved = h('input', { type: 'number', value: o?.achievedAmount ?? 0 });
  const m = modal({
    title: o ? 'Editar objetivo' : 'Nuevo objetivo',
    body: h('div', { class: 'form-grid' },
      field('Vendedor', emp),
      h('div', { class: 'form-grid two' }, field('Periodo', period), field('Meta ($)', target)),
      field('Alcanzado ($)', achieved),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!period.value || !target.value) return toast('Periodo y meta son obligatorios', 'err');
        try { await api.post('/crm/objectives', { employeeId: Number(emp.value), period: period.value, targetAmount: Number(target.value), achievedAmount: Number(achieved.value) || 0 }); toast('Objetivo guardado', 'ok'); m.close(); reload(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
  });
}

function opt(value, label, selected) { const o = h('option', { value }, label); if (selected) o.selected = true; return o; }
function reload() { import('../../router.js').then((r) => r.render()); }
