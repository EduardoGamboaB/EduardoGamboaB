import { api } from '../api.js';
import { h, clear, field, modal, toast, confirmDialog } from '../ui.js';
import { can, state } from '../state.js';

const DOW = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']];

export default async function schedules(el) {
  clear(el);
  const [list, settings] = await Promise.all([api.get('/schedules'), api.get('/settings')]);
  const editable = can('admin', 'contador');

  // ----- Turnos -----
  const grid = h('div', { class: 'grid grid-3' },
    ...list.map((s) => h('div', { class: 'card card-pad' },
      h('div', { class: 'row spread' }, h('strong', {}, s.name), editable ? h('button', { class: 'btn btn-sm', onClick: () => schedModal(s) }, 'Editar') : null),
      h('div', { class: 'row mt', style: 'gap:16px' },
        h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, 'Entrada'), h('div', { class: 'strong mono' }, s.entryTime)),
        h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, 'Salida'), h('div', { class: 'strong mono' }, s.exitTime)),
        h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, 'Comida'), h('div', { class: 'strong mono' }, s.lunchMinutes + 'm')),
      ),
      h('div', { class: 'row mt', style: 'gap:16px' },
        h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, 'Tolerancia'), h('div', { class: 'mono' }, s.toleranceMinutes + 'm')),
        h('div', {}, h('div', { class: 'muted', style: 'font-size:11px' }, 'Retardo hasta'), h('div', { class: 'mono' }, s.lateAfterMinutes + 'm')),
      ),
      h('div', { class: 'pill-row mt' }, ...DOW.map(([d, l]) => h('span', { class: `badge ${(s.workDays || []).includes(d) ? 'b-info' : 'b-gray'}` }, l))),
    )),
  );

  el.appendChild(h('div', { class: 'toolbar' },
    h('div', { class: 'grow' }, h('div', { class: 'muted' }, 'Turnos, tolerancias y reglas de asistencia por horario.')),
    editable ? h('button', { class: 'btn btn-primary', onClick: () => schedModal(null) }, '+ Turno') : null,
  ));
  el.appendChild(grid);

  // ----- Reglas globales -----
  el.appendChild(h('div', { class: 'card mt', style: 'margin-top:22px' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Reglas operativas globales'), h('span', { class: 'sub' }, 'Aplican a todos los horarios')),
    h('div', { class: 'card-pad' }, rulesForm(settings, editable)),
  ));
}

function rulesForm(s, editable) {
  const f = {
    overtimeThresholdMin: h('input', { type: 'number', value: s.overtimeThresholdMin ?? 15 }),
    overtimeMinBlockMin: h('input', { type: 'number', value: s.overtimeMinBlockMin ?? 30 }),
    bonusMaxRetardos: h('input', { type: 'number', value: s.bonusMaxRetardos ?? 2 }),
    bonusAllowFaltas: h('input', { type: 'number', value: s.bonusAllowFaltas ?? 0 }),
    bonusAmount: h('input', { type: 'number', step: '0.01', value: s.bonusAmount ?? 300 }),
    earlyLeaveThresholdMin: h('input', { type: 'number', value: s.earlyLeaveThresholdMin ?? 10 }),
  };
  Object.values(f).forEach((i) => (i.disabled = !editable));
  const form = h('div', { class: 'form-grid', style: 'grid-template-columns:repeat(3,1fr)' },
    field('Umbral tiempo extra (min)', f.overtimeThresholdMin, 'después de la salida'),
    field('Bloque mínimo T.Extra (min)', f.overtimeMinBlockMin),
    field('Salida anticipada (min)', f.earlyLeaveThresholdMin),
    field('Retardos máx. para bono', f.bonusMaxRetardos),
    field('Faltas permitidas para bono', f.bonusAllowFaltas),
    field('Importe del bono', f.bonusAmount),
  );
  const wrap = h('div', {}, form);
  if (editable) {
    wrap.appendChild(h('div', { class: 'row mt', style: 'justify-content:flex-end' },
      h('button', { class: 'btn btn-primary', onClick: async () => {
        const payload = Object.fromEntries(Object.entries(f).map(([k, i]) => [k, Number(i.value)]));
        try { await api.put('/settings', payload); state.settings = { ...state.settings, ...payload }; toast('Reglas actualizadas', 'ok'); } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar reglas')));
  }
  return wrap;
}

function schedModal(s) {
  const isNew = !s;
  const f = {
    name: h('input', { value: s?.name || '' }),
    entryTime: h('input', { type: 'time', value: s?.entryTime || '08:00' }),
    exitTime: h('input', { type: 'time', value: s?.exitTime || '17:00' }),
    lunchMinutes: h('input', { type: 'number', value: s?.lunchMinutes ?? 60 }),
    toleranceMinutes: h('input', { type: 'number', value: s?.toleranceMinutes ?? 10 }),
    lateAfterMinutes: h('input', { type: 'number', value: s?.lateAfterMinutes ?? 20 }),
    hoursPerDay: h('input', { type: 'number', value: s?.hoursPerDay ?? 8 }),
  };
  const dayChecks = DOW.map(([d, l]) => {
    const cb = h('input', { type: 'checkbox', value: d }); cb.checked = (s?.workDays || [1, 2, 3, 4, 5]).includes(d);
    return { d, el: h('label', {}, cb, ' ' + l), cb };
  });
  const m = modal({
    title: isNew ? 'Nuevo turno' : `Editar turno · ${s.name}`,
    body: h('div', { class: 'form-grid' },
      field('Nombre del turno', f.name),
      h('div', { class: 'form-grid two' }, field('Entrada', f.entryTime), field('Salida', f.exitTime)),
      h('div', { class: 'form-grid two' }, field('Comida (min)', f.lunchMinutes), field('Horas por día', f.hoursPerDay)),
      h('div', { class: 'form-grid two' }, field('Tolerancia (min)', f.toleranceMinutes, 'sin retardo'), field('Retardo hasta (min)', f.lateAfterMinutes, 'después = falta')),
      h('label', { class: 'field' }, h('span', {}, 'Días laborables'), h('div', { class: 'checks' }, ...dayChecks.map((c) => c.el))),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        const payload = {
          name: f.name.value, entryTime: f.entryTime.value, exitTime: f.exitTime.value,
          lunchMinutes: Number(f.lunchMinutes.value), toleranceMinutes: Number(f.toleranceMinutes.value),
          lateAfterMinutes: Number(f.lateAfterMinutes.value), hoursPerDay: Number(f.hoursPerDay.value),
          workDays: dayChecks.filter((c) => c.cb.checked).map((c) => c.d),
        };
        try { if (isNew) await api.post('/schedules', payload); else await api.put(`/schedules/${s.id}`, payload); toast('Turno guardado', 'ok'); m.close(); reload(); } catch (e) { toast(e.message, 'err'); }
      } }, isNew ? 'Crear' : 'Guardar'),
    ],
  });
}

function reload() { import('../router.js').then((r) => r.render()); }
