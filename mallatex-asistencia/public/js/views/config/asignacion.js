import { api } from '../../api.js';
import { h, clear, modal, field, toast, empty } from '../../ui.js';

export default async function asignacion(el) {
  clear(el);
  const [catalog, perms, users, employees] = await Promise.all([
    api.get('/access/catalog'), api.get('/access/permissions'), api.get('/access/users'), api.get('/access/employees'),
  ]);
  const roleLabel = Object.fromEntries(catalog.roles.map((r) => [r.value, r.label]));

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('h2', { style: 'margin:0' }, 'Asignación de acceso'),
    h('div', { class: 'muted mt' }, 'Asigna el rol y ajusta módulos por usuario (web); asigna el perfil de la app móvil por colaborador.'),
  ));

  // ---------- Usuarios (web) ----------
  const uCard = h('div', { class: 'card mb' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Usuarios administrativos'), h('span', { class: 'sub' }, `${users.length} usuarios`)),
  );
  if (!users.length) uCard.appendChild(empty('👤', 'Sin usuarios.'));
  else uCard.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Usuario'), h('th', {}, 'Rol'), h('th', { class: 'num' }, 'Módulos'), h('th', {}, 'Ajustes'), h('th', {}, ''))),
    h('tbody', {}, ...users.map((u) => {
      const extra = (u.extraModules || []).length, revoked = (u.revokedModules || []).length;
      return h('tr', {},
        h('td', {}, h('div', { class: 'strong' }, u.name), h('div', { class: 'muted mono', style: 'font-size:11px' }, u.email)),
        h('td', {}, h('span', { class: 'badge b-info' }, roleLabel[u.role] || u.role)),
        h('td', { class: 'num mono' }, String((u.modules || []).length)),
        h('td', {}, extra || revoked
          ? h('span', { class: 'muted', style: 'font-size:12px' }, `${extra ? '+' + extra : ''}${extra && revoked ? ' / ' : ''}${revoked ? '−' + revoked : ''}`)
          : h('span', { class: 'muted' }, '—')),
        h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => userAccessModal(u, catalog, perms) }, 'Editar acceso')),
      );
    })),
  )));
  el.appendChild(uCard);

  // ---------- Colaboradores (móvil) ----------
  const eCard = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Colaboradores · perfil de la app móvil'), h('span', { class: 'sub' }, `${employees.length} colaboradores`)),
  );
  if (!employees.length) eCard.appendChild(empty('🧑‍💼', 'Sin colaboradores.'));
  else eCard.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Colaborador'), h('th', {}, 'Área'), h('th', {}, 'Perfil (app móvil)'), h('th', { class: 'num' }, 'Módulos'))),
    h('tbody', {}, ...employees.map((e) => {
      const count = h('td', { class: 'num mono' }, String((e.modules || []).length));
      const sel = h('select', {},
        opt('', `Automático (${e.profile})`, !e.appProfile),
        ...catalog.profiles.map((p) => opt(p.value, p.label, e.appProfile === p.value)),
      );
      sel.addEventListener('change', async () => {
        try {
          const r = await api.put(`/access/employees/${e.id}`, { appProfile: sel.value || null });
          count.textContent = String((r.modules || []).length);
          toast(`Perfil de ${e.name}: ${r.profile}`, 'ok');
        } catch (err) { toast(err.message, 'err'); }
      });
      return h('tr', {},
        h('td', {}, h('div', { class: 'strong' }, e.name), h('div', { class: 'muted mono', style: 'font-size:11px' }, `${e.code} · ${e.department || '—'}`)),
        h('td', { class: 'muted' }, e.position || '—'),
        h('td', {}, sel),
        count,
      );
    })),
  )));
  el.appendChild(eCard);
}

function userAccessModal(user, catalog, perms) {
  const roleSel = h('select', {}, ...catalog.roles.map((r) => opt(r.value, r.label, user.role === r.value)));
  const boxes = {};
  const groups = {};
  for (const m of catalog.webModules) (groups[m.group] ||= []).push(m);

  const grid = h('div', { style: 'max-height:46vh;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px' });
  for (const [group, items] of Object.entries(groups)) {
    grid.appendChild(h('div', { class: 'muted', style: 'font-size:11px;font-weight:700;text-transform:uppercase;margin:8px 0 4px' }, group));
    for (const m of items) {
      const cb = h('input', { type: 'checkbox' });
      cb.checked = (user.modules || []).includes(m.key);
      boxes[m.key] = cb;
      grid.appendChild(h('label', { style: 'display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer' }, cb, h('span', {}, m.label)));
    }
  }
  const applyBase = (role) => { const base = perms.web[role] || []; for (const [k, cb] of Object.entries(boxes)) cb.checked = base.includes(k); };
  roleSel.addEventListener('change', () => applyBase(roleSel.value));

  const m = modal({
    title: `Acceso · ${user.name}`,
    body: h('div', { class: 'form-grid' },
      field('Rol', roleSel, 'Al cambiar de rol se cargan sus módulos por defecto; luego puedes afinar.'),
      field('Módulos habilitados', grid),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        const role = roleSel.value;
        const base = perms.web[role] || [];
        const checked = Object.entries(boxes).filter(([, cb]) => cb.checked).map(([k]) => k);
        const extraModules = checked.filter((k) => !base.includes(k));
        const revokedModules = base.filter((k) => !checked.includes(k));
        try { await api.put(`/access/users/${user.id}`, { role, extraModules, revokedModules }); toast('Acceso actualizado', 'ok'); m.close(); reload(); }
        catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
    size: 'lg',
  });
}

function opt(value, label, selected) { const o = h('option', { value }, label); if (selected) o.selected = true; return o; }
function reload() { import('../../router.js').then((r) => r.render()); }
