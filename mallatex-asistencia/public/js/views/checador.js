import { api } from '../api.js';
import { h, clear, field, toast, fmtDateTime, fmtDate, empty } from '../ui.js';
import { currentPeriod, can } from '../state.js';

export default async function checador(el) {
  clear(el);
  const [devices, employees] = await Promise.all([api.get('/devices'), api.get('/employees?active=true')]);
  const device = devices[0];
  const period = currentPeriod();

  const startInput = h('input', { type: 'date', value: period?.startDate || '2026-07-01' });
  const endInput = h('input', { type: 'date', value: '2026-07-22' });
  const empSel = h('select', {}, h('option', { value: '' }, 'Ver todos'), ...employees.map((e) => h('option', { value: e.id }, `${e.code} · ${e.name}`)));
  const dateInput = h('input', { type: 'date', value: '2026-07-22' });
  const checadasWrap = h('div', { class: 'card' });

  // ----- Tarjeta del dispositivo -----
  el.appendChild(h('div', { class: 'grid grid-2 mb' },
    h('div', { class: 'card card-pad' },
      h('div', { class: 'row spread' }, h('h2', { style: 'margin:0' }, device.name), h('span', { class: 'badge b-ok' }, '● En línea')),
      h('div', { class: 'grid grid-2 mt', style: 'gap:10px' },
        info('Marca / Modelo', `${device.brand} · ${device.model}`),
        info('Serie', device.serial),
        info('Dirección IP', device.ip),
        info('Ubicación', device.location),
        info('Última sincronización', device.lastSync ? fmtDateTime(device.lastSync) : 'Nunca'),
        info('Método', 'Reconocimiento facial'),
      ),
    ),
    h('div', { class: 'card card-pad' },
      h('h2', { style: 'margin:0 0 6px' }, 'Sincronización programada'),
      h('p', { class: 'muted', style: 'margin:0 0 14px' }, 'Descarga las checadas del dispositivo y aplica horarios y reglas automáticamente. En producción se ejecuta de forma programada vía ISAPI/SDK Hikvision.'),
      h('div', { class: 'form-grid two' }, field('Desde', startInput), field('Hasta', endInput)),
      can('admin', 'contador', 'nomina')
        ? h('button', { class: 'btn btn-primary btn-block mt', id: 'sync-btn', onClick: doSync }, '⟳ Sincronizar checadas')
        : h('div', { class: 'note-box mt' }, 'Sólo Contabilidad/Nómina puede sincronizar.'),
      h('a', { class: 'btn btn-block mt', href: '/kiosk', target: '_blank', rel: 'noopener' }, '🖥  Abrir modo kiosco (pantalla del empleado) ↗'),
    ),
  ));

  async function doSync() {
    const btn = document.getElementById('sync-btn');
    btn.disabled = true; btn.textContent = 'Sincronizando…';
    try {
      const r = await api.post(`/devices/${device.id}/sync`, { startDate: startInput.value, endDate: endInput.value });
      toast(`${r.createdCount} checadas descargadas y procesadas`, 'ok');
      await loadChecadas();
      import('../router.js'); window.dispatchEvent(new Event('mtx:refresh'));
    } catch (e) { toast(e.message, 'err'); }
    btn.disabled = false; btn.textContent = '⟳ Sincronizar checadas';
  }

  // ----- Checadas -----
  async function loadChecadas() {
    const params = new URLSearchParams();
    if (empSel.value) params.set('employeeId', empSel.value);
    if (dateInput.value) params.set('date', dateInput.value);
    const rows = await api.get('/checadas?' + params.toString());
    const empById = Object.fromEntries(employees.map((e) => [e.id, e.name]));
    clear(checadasWrap);
    checadasWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Registros del checador'), h('span', { class: 'sub' }, `${rows.length} checada(s)`)));
    if (!rows.length) { checadasWrap.appendChild(empty('⧉', 'Sin checadas para el filtro seleccionado.')); return; }
    checadasWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Fecha'), h('th', {}, 'Hora'), h('th', {}, 'Empleado'), h('th', {}, 'Tipo'), h('th', {}, 'Método'), h('th', {}, 'Origen'))),
      h('tbody', {}, ...rows.map((c) => h('tr', {},
        h('td', { class: 'mono' }, fmtDate(c.timestamp.slice(0, 10), { day: '2-digit', month: 'short' })),
        h('td', { class: 'mono strong' }, new Date(c.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })),
        h('td', {}, empById[c.employeeId] || `#${c.employeeId}`),
        h('td', {}, h('span', { class: `badge ${c.type === 'entrada' ? 'b-ok' : c.type === 'salida' ? 'b-info' : 'b-gray'}` }, c.type)),
        h('td', { class: 'muted' }, c.method || '—'),
        h('td', { class: 'mono muted', style: 'font-size:11px' }, c.raw || '—'),
      ))),
    )));
  }

  [empSel, dateInput].forEach((n) => n.addEventListener('change', loadChecadas));
  el.appendChild(h('div', { class: 'toolbar' }, field('Empleado', empSel), field('Día', dateInput)));
  el.appendChild(checadasWrap);
  await loadChecadas();
}

function info(label, value) {
  return h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, label), h('div', { class: 'strong' }, value || '—'));
}
