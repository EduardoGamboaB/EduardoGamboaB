import { api } from '../../api.js';
import { h, clear, fmtDate, stateBadge, modal, field, toast, empty, confirmDialog } from '../../ui.js';

const TYPES = [['vacaciones', 'Vacaciones'], ['permiso_goce', 'Permiso con goce'], ['permiso_singoce', 'Permiso sin goce']];
const TYPE_LABEL = Object.fromEntries(TYPES);

export default async function misVacaciones(el) {
  clear(el);
  const me = await api.get('/portal/me');
  const v = me.vacation;

  el.appendChild(h('div', { class: 'grid grid-4 mb' },
    h('div', { class: 'card kpi accent' }, h('div', { class: 'kpi-label' }, 'Disponibles'), h('div', { class: 'kpi-value' }, String(v.available)), h('div', { class: 'kpi-foot' }, 'días de vacaciones')),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi-label' }, 'Derecho anual'), h('div', { class: 'kpi-value' }, String(v.entitled)), h('div', { class: 'kpi-foot' }, `${v.years} año(s) de antigüedad`)),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi-label' }, 'Tomados', ), h('div', { class: 'kpi-value' }, String(v.taken)), h('div', { class: 'kpi-foot' }, 'en el año de servicio')),
    h('div', { class: 'card kpi' }, h('div', { class: 'kpi-label' }, 'Antigüedad'), h('div', { class: 'kpi-value' }, v.years + 'a'), h('div', { class: 'kpi-foot' }, 'Ley Federal del Trabajo')),
  ));

  const tableWrap = h('div', { class: 'card' });
  el.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'grow' }, h('div', { class: 'muted' }, 'Solicita vacaciones o permisos; quedan pendientes hasta que RH/Contabilidad los autorice.')),
    h('button', { class: 'btn btn-primary', onClick: () => requestModal(v, load) }, '+ Nueva solicitud')));
  el.appendChild(tableWrap);

  async function load() {
    const items = await api.get('/portal/me/requests');
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' }, h('h2', {}, 'Mis solicitudes'), h('span', { class: 'sub' }, `${items.length} solicitud(es)`)));
    if (!items.length) { tableWrap.appendChild(empty('🌴', 'Aún no tienes solicitudes.')); return; }
    tableWrap.appendChild(h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {}, h('th', {}, 'Tipo'), h('th', {}, 'Periodo'), h('th', {}, 'Motivo'), h('th', {}, 'Estado'), h('th', {}, ''))),
      h('tbody', {}, ...items.map((i) => h('tr', {},
        h('td', {}, h('span', { class: 'badge b-purple' }, TYPE_LABEL[i.type] || i.type)),
        h('td', { class: 'mono' }, `${fmtDate(i.startDate, { day: '2-digit', month: 'short' })} – ${fmtDate(i.endDate, { day: '2-digit', month: 'short' })}`),
        h('td', { class: 'muted' }, i.reason || '—'),
        h('td', {}, stateBadge(i.status)),
        h('td', {}, i.status === 'pendiente' ? h('button', { class: 'btn btn-sm btn-danger', onClick: async () => {
          if (await confirmDialog({ title: 'Cancelar solicitud', message: '¿Cancelar esta solicitud pendiente?', confirmText: 'Cancelar', danger: true })) {
            try { await api.del(`/portal/me/requests/${i.id}`); toast('Solicitud cancelada', 'ok'); load(); } catch (e) { toast(e.message, 'err'); }
          }
        } }, 'Cancelar') : null)))))));
  }
  await load();
}

function requestModal(vac, onDone) {
  const typeSel = h('select', {}, ...TYPES.map(([v, l]) => h('option', { value: v }, l)));
  const start = h('input', { type: 'date' });
  const end = h('input', { type: 'date' });
  const reason = h('textarea', { rows: '2', placeholder: 'Motivo' });
  const m = modal({
    title: 'Nueva solicitud',
    body: h('div', { class: 'form-grid' },
      h('div', { class: 'note-box' }, `Tienes ${vac.available} día(s) de vacaciones disponibles.`),
      field('Tipo', typeSel),
      h('div', { class: 'form-grid two' }, field('Desde', start), field('Hasta', end)),
      field('Motivo', reason)),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!start.value || !end.value) return toast('Indica las fechas', 'err');
        try {
          await api.post('/portal/me/requests', { type: typeSel.value, startDate: start.value, endDate: end.value, reason: reason.value.trim() });
          toast('Solicitud enviada', 'ok'); m.close(); onDone();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Enviar solicitud')],
  });
}
