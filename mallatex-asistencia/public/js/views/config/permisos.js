import { api } from '../../api.js';
import { h, clear, toast } from '../../ui.js';

export default async function permisos(el) {
  clear(el);
  const [catalog, perms] = await Promise.all([api.get('/access/catalog'), api.get('/access/permissions')]);

  // Estado editable en memoria (Sets por rol/perfil).
  const webState = {};
  for (const r of catalog.roles) webState[r.value] = new Set(perms.web[r.value] || []);
  const mobState = {};
  for (const p of catalog.profiles) mobState[p.value] = new Set(perms.mobile[p.value] || []);

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {}, h('h2', { style: 'margin:0' }, 'Permisos'), h('div', { class: 'muted mt' }, 'Define qué módulos ve cada rol (web) y cada perfil (móvil). El administrador siempre conserva acceso total.')),
      h('button', { class: 'btn btn-primary', onClick: save }, 'Guardar cambios'),
    ),
  ));

  el.appendChild(matrix('Web — módulos por rol', catalog.webModules, catalog.roles.map((r) => ({ id: r.value, label: r.label })), webState, { lockedCol: 'admin' }));
  el.appendChild(matrix('Móvil — módulos por perfil', catalog.mobileModules, catalog.profiles.map((p) => ({ id: p.value, label: p.label })), mobState, {}));

  async function save() {
    const web = Object.fromEntries(catalog.roles.map((r) => [r.value, [...webState[r.value]]]));
    const mobile = Object.fromEntries(catalog.profiles.map((p) => [p.value, [...mobState[p.value]]]));
    try { await api.put('/access/permissions', { web, mobile }); toast('Permisos guardados', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }
}

function matrix(title, modules, cols, state, { lockedCol }) {
  const byGroup = {};
  for (const m of modules) (byGroup[m.group] ||= []).push(m);

  const head = h('tr', {}, h('th', { style: 'text-align:left' }, 'Módulo'), ...cols.map((c) => h('th', { style: 'text-align:center;white-space:nowrap' }, c.label)));
  const body = h('tbody', {});
  for (const [group, items] of Object.entries(byGroup)) {
    body.appendChild(h('tr', {}, h('td', { colSpan: cols.length + 1, class: 'muted', style: 'background:var(--line-2);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px' }, group)));
    for (const m of items) {
      const cells = cols.map((c) => {
        const locked = lockedCol && c.id === lockedCol;
        const cb = h('input', { type: 'checkbox' });
        cb.checked = locked ? true : state[c.id].has(m.key);
        cb.disabled = !!locked;
        cb.addEventListener('change', () => { if (cb.checked) state[c.id].add(m.key); else state[c.id].delete(m.key); });
        return h('td', { style: 'text-align:center' }, cb);
      });
      body.appendChild(h('tr', {}, h('td', { class: 'strong' }, m.label, h('span', { class: 'mono muted', style: 'font-size:11px;margin-left:6px' }, m.key)), ...cells));
    }
  }

  return h('div', { class: 'card mb' },
    h('div', { class: 'card-head' }, h('h2', {}, title), h('span', { class: 'sub' }, `${modules.length} módulos · ${cols.length} ${lockedCol ? 'roles' : 'perfiles'}`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, head), body)),
  );
}
