import { api } from '../api.js';
import { h, clear, fmtDate, stateBadge, modal, field, toast, empty, confirmDialog, money } from '../ui.js';
import { currentPeriod, can } from '../state.js';

export default async function noi(el) {
  clear(el);
  const period = currentPeriod();
  if (!period) { el.appendChild(empty('⇄', 'No hay periodos configurados.')); return; }

  const [summary, preview, concepts] = await Promise.all([
    api.get(`/periods/${period.id}/summary`),
    api.get(`/periods/${period.id}/noi/preview`),
    api.get('/noi/concepts'),
  ]);

  el.appendChild(headerCard(period, summary, preview));
  el.appendChild(summaryCard(summary));
  el.appendChild(movementsCard(period, preview));
  el.appendChild(conceptsCard(concepts));
}

function headerCard(period, summary, preview) {
  const pend = summary.pending;
  const hasPending = pend.incidents || pend.overtime;
  const closed = period.status === 'cerrado';

  const actions = [];
  if (!closed && can('admin', 'contador', 'nomina')) {
    actions.push(h('button', { class: 'btn btn-dark', onClick: async () => {
      if (hasPending && !await confirmDialog({ title: 'Cerrar con pendientes', message: `Quedan ${pend.incidents} incidencia(s) y ${pend.overtime} tiempo(s) extra sin autorizar. ¿Cerrar de todas formas?`, confirmText: 'Cerrar periodo' })) return;
      try { await api.post(`/periods/${period.id}/close`, { force: true }); toast('Periodo cerrado', 'ok'); reload(); } catch (e) { toast(e.message, 'err'); }
    } }, 'Cerrar periodo'));
  }
  if (closed && can('admin', 'contador')) {
    actions.push(h('button', { class: 'btn', onClick: async () => {
      try { await api.post(`/periods/${period.id}/reopen`); toast('Periodo reabierto', 'ok'); reload(); } catch (e) { toast(e.message, 'err'); }
    } }, 'Reabrir'));
  }

  const card = h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {},
        h('div', { class: 'row', style: 'gap:10px;align-items:center' }, h('h2', { style: 'margin:0' }, period.name), stateBadge(period.status)),
        h('div', { class: 'muted mt' }, `${fmtDate(period.startDate)} al ${fmtDate(period.endDate)}${period.closedBy ? ' · Cerró: ' + period.closedBy : ''}`),
      ),
      h('div', { class: 'row', style: 'gap:8px' }, ...actions, h('button', { class: 'btn', onClick: () => newPeriodModal() }, '+ Periodo')),
    ),
    hasPending ? h('div', { class: 'note-box warn mt' },
      `Pendientes por autorizar antes de exportar: ${pend.incidents} incidencia(s), ${pend.overtime} tiempo(s) extra` + (pend.omisiones ? `, ${pend.omisiones} omisión(es) por revisar` : '') + '.') : null,
    !hasPending ? h('div', { class: 'note-box mt' }, 'Sin movimientos pendientes: la información está lista para exportarse a NOI.') : null,
  );
  return card;
}

function summaryCard(summary) {
  const rows = summary.rows.filter((r) => r);
  const card = h('div', { class: 'card mb' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Resumen por empleado'), h('span', { class: 'sub' }, `${rows.length} empleados`)),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Empleado'), h('th', { class: 'num' }, 'Asist.'), h('th', { class: 'num' }, 'Retardos'),
        h('th', { class: 'num' }, 'Faltas'), h('th', { class: 'num' }, 'Incid.'), h('th', { class: 'num' }, 'T.Extra'),
        h('th', {}, 'Bono'))),
      h('tbody', {}, ...rows.map((r) => {
        const c = r.counters;
        const incid = c.vacaciones + c.permisos + c.incapacidades + c.justificadas;
        return h('tr', {},
          h('td', {}, h('div', { class: 'strong' }, r.employee.name), h('div', { class: 'muted', style: 'font-size:11px' }, `${r.employee.code} · ${r.employee.department}`)),
          h('td', { class: 'num mono' }, String(c.asistencias)),
          h('td', { class: `num mono ${c.retardos ? 'strong' : 'muted'}` }, String(c.retardos)),
          h('td', { class: `num mono ${c.faltas ? 'strong' : 'muted'}`, style: c.faltas ? 'color:var(--err)' : '' }, String(c.faltas)),
          h('td', { class: 'num mono' }, String(incid)),
          h('td', { class: 'num mono' }, (r.overtimeMinutes / 60).toFixed(1) + 'h'),
          h('td', {}, r.bonusEligible ? h('span', { class: 'badge b-ok' }, '✓ Sí') : h('span', { class: 'badge b-gray' }, 'No')),
        );
      })),
    )),
  );
  return card;
}

function movementsCard(period, preview) {
  const movs = preview.movements;
  const totalImporte = movs.reduce((s, m) => s + (m.importe || 0), 0);
  const exportBtns = h('div', { class: 'row', style: 'gap:8px' },
    h('button', { class: 'btn btn-primary', onClick: () => doExport(period, 'txt') }, '⬇ Exportar .txt'),
    h('button', { class: 'btn', onClick: () => doExport(period, 'csv') }, '⬇ Exportar .csv'),
  );
  const card = h('div', { class: 'card mb' },
    h('div', { class: 'card-head' },
      h('div', {}, h('h2', {}, 'Movimientos para NOI'), h('span', { class: 'sub' }, `${movs.length} movimiento(s) · empresa ${(preview.period && 'MALLATEX') || ''}`)),
      exportBtns),
    movs.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Clave'), h('th', {}, 'Empleado'), h('th', {}, 'Concepto'), h('th', {}, 'Tipo'),
        h('th', { class: 'num' }, 'Cantidad'), h('th', {}, 'Unidad'), h('th', { class: 'num' }, 'Importe'))),
      h('tbody', {}, ...movs.map((m) => h('tr', {},
        h('td', { class: 'mono strong' }, m.noiKey),
        h('td', {}, m.empName),
        h('td', {}, h('span', { class: 'mono muted' }, m.noiNumber + ' '), m.descripcion),
        h('td', {}, tipoBadge(m.tipo)),
        h('td', { class: 'num mono' }, String(m.cantidad)),
        h('td', { class: 'muted' }, m.unidad),
        h('td', { class: 'num mono' }, m.importe ? money(m.importe) : '—'),
      ))),
      h('tfoot', {}, h('tr', {}, h('td', { colspan: '6', class: 'num strong' }, 'Total importe'), h('td', { class: 'num strong' }, money(totalImporte)))),
    )) : empty('⇄', 'No hay movimientos para exportar en este periodo.'),
  );
  return card;
}

function tipoBadge(t) {
  const map = { P: ['b-ok', 'Percepción'], D: ['b-err', 'Deducción'], I: ['b-gray', 'Informativo'] };
  const [cls, label] = map[t] || ['b-gray', t];
  return h('span', { class: `badge ${cls}` }, label);
}

async function doExport(period, format) {
  try {
    await api.download(`/periods/${period.id}/noi/export?format=${format}`, `NOI_${period.name.replace(/[^\w]+/g, '_')}.${format}`);
    toast(`Interfaz NOI (.${format}) generada`, 'ok');
  } catch (e) {
    if (e.status === 409) {
      if (await confirmDialog({ title: 'Movimientos pendientes', message: e.message + '. ¿Exportar de todas formas (forzar)?', confirmText: 'Exportar' })) {
        try { await api.download(`/periods/${period.id}/noi/export?format=${format}&force=1`, `NOI_${period.name.replace(/[^\w]+/g, '_')}.${format}`); toast('Interfaz NOI generada', 'ok'); } catch (e2) { toast(e2.message, 'err'); }
      }
    } else toast(e.message, 'err');
  }
}

function conceptsCard(concepts) {
  const card = h('div', { class: 'card' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Conceptos NOI'), h('span', { class: 'sub' }, 'Mapeo de incidencias a conceptos de Aspel NOI')),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Movimiento'), h('th', {}, 'No. concepto'), h('th', {}, 'Tipo'), h('th', {}, 'Unidad'), h('th', {}, 'Activo'), can('admin', 'contador') ? h('th', {}, '') : null)),
      h('tbody', {}, ...concepts.map((c) => h('tr', {},
        h('td', { class: 'strong' }, c.descripcion),
        h('td', { class: 'mono' }, c.noiNumber),
        h('td', {}, tipoBadge(c.tipo)),
        h('td', { class: 'muted' }, c.unidad),
        h('td', {}, c.enabled === false ? h('span', { class: 'badge b-gray' }, 'No') : h('span', { class: 'badge b-ok' }, 'Sí')),
        can('admin', 'contador') ? h('td', {}, h('button', { class: 'btn btn-sm', onClick: () => editConcept(c) }, 'Editar')) : null,
      ))),
    )),
  );
  return card;
}

function editConcept(c) {
  const num = h('input', { value: c.noiNumber });
  const tipo = h('select', {}, ...[['P', 'Percepción'], ['D', 'Deducción'], ['I', 'Informativo']].map(([v, l]) => { const o = h('option', { value: v }, l); if (v === c.tipo) o.selected = true; return o; }));
  const enabled = h('input', { type: 'checkbox' }); enabled.checked = c.enabled !== false;
  const m = modal({
    title: `Concepto NOI · ${c.descripcion}`,
    body: h('div', { class: 'form-grid' },
      field('Número de concepto en NOI', num),
      field('Tipo', tipo),
      h('label', { class: 'field' }, h('span', {}, 'Activo'), h('div', { class: 'checks' }, h('label', {}, enabled, ' Incluir en la exportación'))),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        try { await api.put(`/noi/concepts/${c.id}`, { noiNumber: num.value, tipo: tipo.value, enabled: enabled.checked }); toast('Concepto actualizado', 'ok'); m.close(); reload(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
  });
}

function newPeriodModal() {
  const name = h('input', { placeholder: 'p. ej. 1ª quincena agosto 2026' });
  const start = h('input', { type: 'date' });
  const end = h('input', { type: 'date' });
  const m = modal({
    title: 'Nuevo periodo de nómina',
    body: h('div', { class: 'form-grid' }, field('Nombre', name), h('div', { class: 'form-grid two' }, field('Inicio', start), field('Fin', end))),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!name.value || !start.value || !end.value) return toast('Todos los campos son obligatorios', 'err');
        try { await api.post('/periods', { name: name.value, startDate: start.value, endDate: end.value }); toast('Periodo creado', 'ok'); m.close(); window.dispatchEvent(new Event('mtx:refresh')); reload(); } catch (e) { toast(e.message, 'err'); }
      } }, 'Crear'),
    ],
  });
}

function reload() { import('../router.js').then((r) => r.render()); }
