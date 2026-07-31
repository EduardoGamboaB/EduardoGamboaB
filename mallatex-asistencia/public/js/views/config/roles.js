import { api } from '../../api.js';
import { h, clear, empty } from '../../ui.js';

const ROLE_HINT = {
  admin: 'Acceso total, incluida la Configuración (usuarios, roles y permisos).',
  contador: 'Operación, nómina, comercial, RH y catálogos. Sin Configuración.',
  nomina: 'Operación, nómina, RH y catálogos. Sin comercial ni configuración.',
  comercial: 'Sólo el módulo Comercial (cartera, objetivos, viáticos/gastos y facturación).',
};

export default async function roles(el) {
  clear(el);
  const [catalog, perms] = await Promise.all([api.get('/access/catalog'), api.get('/access/permissions')]);
  const labelOf = Object.fromEntries(catalog.webModules.map((m) => [m.key, m.label]));

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('h2', { style: 'margin:0' }, 'Roles'),
    h('div', { class: 'muted mt' }, 'Perfiles de acceso para usuarios administrativos (web). Los módulos de cada rol se editan en Configuración → Permisos.'),
  ));

  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Catálogo de roles'), h('span', { class: 'sub' }, `${catalog.roles.length} roles`)),
  );
  if (!catalog.roles.length) card.appendChild(empty('🛡', 'Sin roles.'));
  else card.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Rol'), h('th', {}, 'Descripción'), h('th', { class: 'num' }, 'Módulos'), h('th', {}, 'Acceso'))),
    h('tbody', {}, ...catalog.roles.map((r) => {
      const mods = perms.web[r.value] || [];
      return h('tr', {},
        h('td', {}, h('span', { class: 'badge b-info' }, r.label), h('div', { class: 'muted mono', style: 'font-size:11px;margin-top:4px' }, r.value)),
        h('td', { class: 'muted' }, ROLE_HINT[r.value] || '—'),
        h('td', { class: 'num mono' }, String(mods.length)),
        h('td', {}, h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;max-width:520px' },
          ...mods.slice(0, 8).map((k) => h('span', { class: 'badge b-gray', style: 'font-size:11px' }, labelOf[k] || k)),
          mods.length > 8 ? h('span', { class: 'muted', style: 'font-size:11px' }, `+${mods.length - 8} más`) : null)),
      );
    })),
  )));
  el.appendChild(card);
}
