import { api } from '../api.js';
import { h, clear, field, modal, toast, empty } from '../ui.js';

const ROLE_LABEL = { admin: 'Administrador', contador: 'Contador general', nomina: 'Responsable de nómina' };

export default async function users(el) {
  clear(el);
  const [list, roles] = await Promise.all([api.get('/users'), api.get('/meta/roles')]);
  const activeCount = list.filter((u) => u.active !== false).length;

  el.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'grow' }, h('div', { class: 'muted' }, `${activeCount} de 5 usuarios administrativos (plan Renta Operativa).`)),
    h('button', { class: 'btn btn-primary', onClick: () => userModal(null, roles), disabled: activeCount >= 5 }, '+ Usuario'),
  ));

  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Usuarios administrativos'), h('span', { class: 'sub' }, 'Contabilidad y Nómina')),
  );
  if (!list.length) { card.appendChild(empty('⚙', 'Sin usuarios.')); }
  else card.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Nombre'), h('th', {}, 'Correo'), h('th', {}, 'Rol'), h('th', {}, 'Estado'), h('th', {}, ''))),
    h('tbody', {}, ...list.map((u) => h('tr', {},
      h('td', {}, h('div', { class: 'strong' }, u.name), h('div', { class: 'muted', style: 'font-size:11px' }, u.position || '')),
      h('td', { class: 'mono' }, u.email),
      h('td', {}, h('span', { class: 'badge b-info' }, ROLE_LABEL[u.role] || u.role)),
      h('td', {}, u.active !== false ? h('span', { class: 'badge b-ok' }, 'Activo') : h('span', { class: 'badge b-gray' }, 'Inactivo')),
      h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => userModal(u, roles) }, 'Editar')),
    ))),
  )));
  el.appendChild(card);
}

function userModal(user, roles) {
  const isNew = !user;
  const f = {
    name: h('input', { value: user?.name || '' }),
    email: h('input', { type: 'email', value: user?.email || '' }),
    position: h('input', { value: user?.position || '' }),
    role: h('select', {}, ...roles.map((r) => { const o = h('option', { value: r.value }, r.label); if (user?.role === r.value) o.selected = true; return o; })),
    password: h('input', { type: 'password', placeholder: isNew ? 'Contraseña' : 'Dejar vacío para no cambiar' }),
    active: h('input', { type: 'checkbox' }),
  };
  f.active.checked = user ? user.active !== false : true;
  const m = modal({
    title: isNew ? 'Nuevo usuario' : `Editar · ${user.name}`,
    body: h('div', { class: 'form-grid' },
      field('Nombre', f.name),
      h('div', { class: 'form-grid two' }, field('Correo', f.email), field('Puesto', f.position)),
      h('div', { class: 'form-grid two' }, field('Rol', f.role), field('Contraseña', f.password)),
      !isNew ? h('label', { class: 'field' }, h('span', {}, 'Estado'), h('div', { class: 'checks' }, h('label', {}, f.active, ' Activo'))) : null,
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!f.name.value || !f.email.value || (isNew && !f.password.value)) return toast('Nombre, correo y contraseña son obligatorios', 'err');
        const payload = { name: f.name.value, email: f.email.value, position: f.position.value, role: f.role.value };
        if (f.password.value) payload.password = f.password.value;
        if (!isNew) payload.active = f.active.checked;
        try {
          if (isNew) await api.post('/users', payload); else await api.put(`/users/${user.id}`, payload);
          toast('Usuario guardado', 'ok'); m.close(); import('../router.js').then((r) => r.render());
        } catch (e) { toast(e.message, 'err'); }
      } }, isNew ? 'Crear' : 'Guardar'),
    ],
  });
}
