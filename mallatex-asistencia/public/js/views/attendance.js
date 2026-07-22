import { api } from '../api.js';
import { h, clear, fmtDate, fmtDow, statusBadge, STATUS_META, modal, field, toast, empty } from '../ui.js';
import { currentPeriod, can } from '../state.js';

const MANUAL_STATUSES = ['asistencia', 'retardo', 'falta', 'justificada', 'vacaciones', 'permiso', 'incapacidad', 'descanso', 'festivo', 'omision'];

const filters = { department: '', status: '', q: '' };

export default async function attendance(el) {
  const period = currentPeriod();
  clear(el);

  const range = { start: period?.startDate || '2026-07-01', end: period?.endDate || '2026-07-31' };

  const startInput = h('input', { type: 'date', value: range.start });
  const endInput = h('input', { type: 'date', value: range.end });
  const deptSel = h('select', {}, h('option', { value: '' }, 'Todas las áreas'));
  const statusSel = h('select', {}, h('option', { value: '' }, 'Todos los estatus'),
    ...MANUAL_STATUSES.map((s) => h('option', { value: s }, STATUS_META[s]?.label || s)));
  const search = h('input', { type: 'search', placeholder: 'Buscar empleado…' });

  const tableWrap = h('div', { class: 'card' });

  async function load() {
    const params = new URLSearchParams({ start: startInput.value, end: endInput.value });
    if (deptSel.value) params.set('department', deptSel.value);
    if (statusSel.value) params.set('status', statusSel.value);
    const rows = await api.get('/attendance?' + params.toString());
    const q = search.value.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => (r.employeeName || '').toLowerCase().includes(q) || (r.employeeCode || '').toLowerCase().includes(q)) : rows;
    renderTable(filtered);
    // Poblar áreas
    if (deptSel.children.length === 1) {
      const depts = [...new Set(rows.map((r) => r.department).filter(Boolean))].sort();
      depts.forEach((d) => deptSel.appendChild(h('option', { value: d }, d)));
    }
  }

  function renderTable(rows) {
    clear(tableWrap);
    tableWrap.appendChild(h('div', { class: 'card-head' },
      h('h2', {}, 'Asistencia diaria'),
      h('span', { class: 'sub' }, `${rows.length} registro(s)`),
    ));
    if (!rows.length) { tableWrap.appendChild(empty('☑', 'Sin registros para el filtro seleccionado.')); return; }
    const body = h('tbody', {},
      ...rows.map((r) => h('tr', {},
        h('td', {}, h('div', { class: 'strong' }, fmtDate(r.date, { day: '2-digit', month: 'short' })), h('div', { class: 'muted', style: 'font-size:11px;text-transform:capitalize' }, fmtDow(r.date))),
        h('td', {}, h('div', { class: 'strong' }, r.employeeName || '—'), h('div', { class: 'muted', style: 'font-size:11px' }, `${r.employeeCode || ''} · ${r.department || ''}`)),
        h('td', { class: 'mono' }, r.firstIn || '—'),
        h('td', { class: 'mono' }, r.lastOut || '—'),
        h('td', { class: 'num mono' }, r.workedMinutes ? (r.workedMinutes / 60).toFixed(1) + 'h' : '—'),
        h('td', { class: 'num mono' }, r.lateMinutes ? r.lateMinutes + 'm' : '—'),
        h('td', { class: 'num mono' }, r.overtimeMinutes ? (r.overtimeMinutes / 60).toFixed(1) + 'h' : '—'),
        h('td', {}, statusBadge(r.status), r.manualStatus ? h('span', { class: 'badge b-info', style: 'margin-left:5px', title: r.manualNote || '' }, '✎ manual') : null),
        h('td', {}, can('admin', 'contador', 'nomina')
          ? h('button', { class: 'btn btn-sm', onClick: () => correctModal(r, load) }, 'Corregir')
          : null),
      )),
    );
    tableWrap.appendChild(h('div', { class: 'table-wrap' },
      h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Fecha'), h('th', {}, 'Empleado'), h('th', {}, 'Entrada'), h('th', {}, 'Salida'),
          h('th', { class: 'num' }, 'Trab.'), h('th', { class: 'num' }, 'Retardo'), h('th', { class: 'num' }, 'T.Extra'),
          h('th', {}, 'Estatus'), h('th', {}, ''))),
        body,
      )));
  }

  const reprocessBtn = h('button', { class: 'btn btn-dark', onClick: async () => {
    reprocessBtn.disabled = true; reprocessBtn.textContent = 'Procesando…';
    try {
      const r = await api.post('/attendance/reprocess', { start: startInput.value, end: endInput.value });
      toast(`Reprocesados ${r.count} registros`, 'ok');
      await load();
    } catch (e) { toast(e.message, 'err'); }
    reprocessBtn.disabled = false; reprocessBtn.textContent = 'Reprocesar reglas';
  } }, 'Reprocesar reglas');

  [startInput, endInput, deptSel, statusSel].forEach((n) => n.addEventListener('change', load));
  search.addEventListener('input', () => { clearTimeout(load._t); load._t = setTimeout(load, 250); });

  el.appendChild(h('div', { class: 'toolbar' },
    field('Desde', startInput), field('Hasta', endInput),
    field('Área', deptSel), field('Estatus', statusSel),
    h('div', { class: 'grow' }, field('Buscar', search)),
    reprocessBtn,
  ));
  el.appendChild(tableWrap);
  await load();
}

function correctModal(row, onDone) {
  const statusSel = h('select', {}, ...MANUAL_STATUSES.map((s) => {
    const o = h('option', { value: s }, STATUS_META[s]?.label || s);
    if (s === row.status) o.selected = true;
    return o;
  }));
  const otInput = h('input', { type: 'number', min: '0', step: '15', value: String(row.overtimeMinutes || 0) });
  const reason = h('textarea', { rows: '2', placeholder: 'Motivo de la corrección (obligatorio)' });

  const m = modal({
    title: `Corregir asistencia · ${row.employeeName}`,
    body: h('div', { class: 'form-grid' },
      h('div', { class: 'note-box' }, `${fmtDate(row.date)} — Entrada ${row.firstIn || '—'} / Salida ${row.lastOut || '—'}. Registro original: ${STATUS_META[row.status]?.label || row.status}.`),
      field('Nuevo estatus', statusSel),
      field('Minutos de tiempo extra', otInput, 'ajuste manual'),
      field('Motivo', reason),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!reason.value.trim()) return toast('El motivo es obligatorio', 'err');
        try {
          await api.put(`/attendance/${row.id}`, { status: statusSel.value, overtimeMinutes: Number(otInput.value), reason: reason.value.trim() });
          toast('Asistencia corregida', 'ok'); m.close(); onDone();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar corrección'),
    ],
  });
}
