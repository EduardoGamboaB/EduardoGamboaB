import { api } from '../../api.js';
import { h, clear } from '../../ui.js';

export default async function modulos(el) {
  clear(el);
  const catalog = await api.get('/access/catalog');

  el.appendChild(h('div', { class: 'card card-pad mb' },
    h('h2', { style: 'margin:0' }, 'Módulos'),
    h('div', { class: 'muted mt' }, 'Catálogo de funcionalidades de la plataforma web y de la app móvil. Referencia para armar los permisos.'),
  ));

  el.appendChild(section('Módulos web (plataforma administrativa)', catalog.webModules, `${catalog.webModules.length} módulos`));
  el.appendChild(section('Módulos móviles (Mallatex Campo)', catalog.mobileModules, `${catalog.mobileModules.length} módulos · perfiles: ${catalog.profiles.map((p) => p.label).join(', ')}`));
}

function section(title, modules, sub) {
  const byGroup = {};
  for (const m of modules) (byGroup[m.group] ||= []).push(m);
  return h('div', { class: 'card mb' },
    h('div', { class: 'card-head' }, h('h2', {}, title), h('span', { class: 'sub' }, sub)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Grupo'), h('th', {}, 'Módulo'), h('th', {}, 'Clave'))),
      h('tbody', {}, ...Object.entries(byGroup).flatMap(([group, items]) => items.map((m, i) => h('tr', {},
        h('td', { class: 'muted' }, i === 0 ? group : ''),
        h('td', { class: 'strong' }, m.label),
        h('td', { class: 'mono muted', style: 'font-size:12px' }, m.key),
      )))),
    )),
  );
}
