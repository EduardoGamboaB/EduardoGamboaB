// Percepciones variables: captura por periodo (kilometraje, costura por m²,
// comisiones…) y catálogo de conceptos. Alimentan la exportación a NOI.
import { api } from '../api.js';
import { h, clear, modal, field, toast, empty, confirmDialog, money, stateBadge } from '../ui.js';
import { currentPeriod, can } from '../state.js';

const MODES = {
  tarifa: { label: 'Tarifa por unidad', hint: 'Importe = cantidad × tarifa' },
  porcentaje: { label: 'Porcentaje sobre base', hint: 'Importe = base × (porcentaje / 100)' },
  importe: { label: 'Importe directo', hint: 'Se captura el importe ya calculado' },
};

let ctx = { period: null, concepts: [], entries: [], employees: [], sources: [] };

const sourceMap = () => Object.fromEntries(ctx.sources.map((s) => [s.id, s]));

export default async function variablePay(el) {
  clear(el);
  const period = currentPeriod();
  if (!period) { el.appendChild(empty('＄', 'No hay periodos configurados.')); return; }

  const [concepts, entries, employees, sources] = await Promise.all([
    api.get('/variable-concepts'),
    api.get(`/variable-entries?periodId=${period.id}`),
    api.get('/employees?active=true'),
    api.get('/variable-sources'),
  ]);
  ctx = { period, concepts, entries, employees, sources };

  el.appendChild(headerCard());
  el.appendChild(entriesCard());
  el.appendChild(conceptsCard());
}

function headerCard() {
  const { period, entries, concepts } = ctx;
  const total = entries.reduce((s, e) => s + (e.importe || 0), 0);
  const canEdit = period.status !== 'cerrado' && can('admin', 'contador', 'nomina');

  // Fuentes externas con al menos un concepto activo → botón de sincronización
  const externalSources = ctx.sources.filter((s) => s.external
    && concepts.some((c) => (c.source || 'manual') === s.id && c.enabled !== false));
  const syncBtns = canEdit
    ? externalSources.map((s) => h('button', { class: 'btn', title: s.hint, onClick: () => doSync(s) }, `⟳ ${shortSource(s.id)}`))
    : [];

  return h('div', { class: 'card card-pad mb' },
    h('div', { class: 'row spread' },
      h('div', {},
        h('div', { class: 'row', style: 'gap:10px;align-items:center' }, h('h2', { style: 'margin:0' }, 'Percepciones variables'), stateBadge(period.status)),
        h('div', { class: 'muted mt' }, `${period.name} · ${entries.length} captura(s) · total ${money(total)}`),
      ),
      h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;justify-content:flex-end' },
        ...syncBtns,
        canEdit ? h('button', { class: 'btn btn-primary', onClick: () => entryModal() }, '+ Captura') : null,
      ),
    ),
    h('div', { class: 'note-box mt' },
      'Estos importes se suman a los movimientos calculados por asistencia al exportar a ',
      h('b', {}, 'Aspel NOI'), ' (ve a ', h('b', {}, 'Periodos y NOI'), ').'),
    externalSources.length ? h('div', { class: 'note-box warn mt' },
      'Las fuentes externas (', externalSources.map((s) => shortSource(s.id)).join(', '),
      ') están en modo ', h('b', {}, 'simulado'), ': la sincronización real se habilita en una fase posterior (G3 para kilometraje, MES para m² de fabricación, Aspel al caer el pago de facturas).') : null,
  );
}

function shortSource(id) {
  return ({ g3: 'G3', mes: 'MES', aspel: 'Aspel', manual: 'Manual' })[id] || id;
}

async function doSync(source) {
  if (!await confirmDialog({ title: `Sincronizar ${source.label}`, message: `Se traerán las lecturas de ${source.label} para este periodo (modo ${source.status}). ¿Continuar?`, confirmText: 'Sincronizar' })) return;
  try {
    const r = await api.post('/variable-sync', { source: source.id, periodId: ctx.period.id });
    toast(`${shortSource(source.id)}: ${r.created} nueva(s), ${r.updated} actualizada(s)`, 'ok');
    reload();
  } catch (e) { toast(e.message, 'err'); }
}

function entriesCard() {
  const { period, entries } = ctx;
  const editable = period.status !== 'cerrado' && can('admin', 'contador', 'nomina');
  const body = entries.length
    ? h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Empleado'), h('th', {}, 'Concepto'), h('th', {}, 'Origen'), h('th', { class: 'num' }, 'Cantidad'),
          h('th', {}, 'Unidad'), h('th', { class: 'num' }, 'Tarifa/%'), h('th', { class: 'num' }, 'Importe'),
          h('th', {}, 'Nota'), editable ? h('th', {}, '') : null)),
        h('tbody', {}, ...entries.map((e) => h('tr', {},
          h('td', {}, h('div', { class: 'strong' }, e.employeeName || '—'), h('div', { class: 'muted', style: 'font-size:11px' }, `${e.employeeCode || ''} · ${e.department || ''}`)),
          h('td', {}, h('span', { class: 'mono muted' }, (e.noiNumber || '') + ' '), e.conceptName || '—'),
          h('td', {}, originBadge(e.source)),
          h('td', { class: 'num mono' }, fmtQty(e)),
          h('td', { class: 'muted' }, e.unidad || ''),
          h('td', { class: 'num mono' }, rateLabel(e)),
          h('td', { class: 'num mono strong' }, money(e.importe || 0)),
          h('td', { class: 'muted', style: 'font-size:12px' }, e.note || '—'),
          editable ? h('td', {}, h('div', { class: 'row', style: 'gap:6px' },
            h('button', { class: 'btn btn-sm', onClick: () => entryModal(e) }, 'Editar'),
            h('button', { class: 'btn btn-sm', onClick: () => deleteEntry(e) }, '✕'),
          )) : null,
        ))),
      ))
    : empty('＄', period.status === 'cerrado' ? 'Sin capturas en este periodo.' : 'Sin capturas. Usa “+ Captura” para registrar kilometraje, costura por m² o comisiones.');
  return h('div', { class: 'card mb' },
    h('div', { class: 'card-head' }, h('h2', {}, 'Capturas del periodo'), h('span', { class: 'sub' }, ctx.period.name)),
    body,
  );
}

function originBadge(source) {
  if (!source || source === 'manual') return h('span', { class: 'badge b-gray' }, 'Manual');
  return h('span', { class: 'badge b-ok', title: 'Sincronizado (simulado)' }, `⟳ ${shortSource(source)}`);
}

function sourceBadge(source) {
  const s = sourceMap()[source] || sourceMap().manual || {};
  if (!source || source === 'manual') return h('span', { class: 'badge b-gray' }, 'Manual');
  return h('span', { class: 'badge b-warn', title: `${s.hint || ''} (${s.status || 'simulado'})` }, `${shortSource(source)} · ${s.status || 'simulado'}`);
}

function fmtQty(e) {
  const n = Number(e.cantidad) || 0;
  return e.modo === 'porcentaje' ? money(n) : String(n);
}
function rateLabel(e) {
  if (e.modo === 'importe') return '—';
  const concept = ctx.concepts.find((c) => c.id === e.conceptId) || {};
  const rate = e.rate != null ? e.rate : concept.rate;
  return e.modo === 'porcentaje' ? `${rate}%` : money(Number(rate) || 0);
}

function conceptsCard() {
  const { concepts } = ctx;
  const admin = can('admin', 'contador');
  return h('div', { class: 'card' },
    h('div', { class: 'card-head' },
      h('div', {}, h('h2', {}, 'Conceptos variables'), h('span', { class: 'sub' }, 'Tipos de percepción configurables')),
      admin ? h('button', { class: 'btn', onClick: () => conceptModal() }, '+ Concepto') : null),
    h('div', { class: 'table-wrap' }, h('table', { class: 'tbl' },
      h('thead', {}, h('tr', {},
        h('th', {}, 'Concepto'), h('th', {}, 'No. NOI'), h('th', {}, 'Cálculo'), h('th', {}, 'Unidad'),
        h('th', { class: 'num' }, 'Tarifa/%'), h('th', {}, 'Fuente'), h('th', {}, 'Área'), h('th', {}, 'Activo'), admin ? h('th', {}, '') : null)),
      h('tbody', {}, ...concepts.map((c) => h('tr', {},
        h('td', { class: 'strong' }, c.name),
        h('td', { class: 'mono' }, c.noiNumber),
        h('td', { class: 'muted', style: 'font-size:12px' }, (MODES[c.modo] || {}).label || c.modo),
        h('td', { class: 'muted' }, c.unidad),
        h('td', { class: 'num mono' }, c.modo === 'porcentaje' ? `${c.rate}%` : (c.modo === 'importe' ? '—' : money(Number(c.rate) || 0))),
        h('td', {}, sourceBadge(c.source)),
        h('td', { class: 'muted' }, c.department || 'Todas'),
        h('td', {}, c.enabled === false ? h('span', { class: 'badge b-gray' }, 'No') : h('span', { class: 'badge b-ok' }, 'Sí')),
        admin ? h('td', {}, h('div', { class: 'row', style: 'gap:6px' },
          h('button', { class: 'btn btn-sm', onClick: () => conceptModal(c) }, 'Editar'),
          h('button', { class: 'btn btn-sm', onClick: () => deleteConcept(c) }, '✕'),
        )) : null,
      ))),
    )),
  );
}

// ---------- Modal de captura ----------
function entryModal(entry) {
  const { concepts, employees } = ctx;
  const usable = concepts.filter((c) => c.enabled !== false);
  const empSel = h('select', {}, ...employees.map((e) => opt(e.id, `${e.code} · ${e.name}${e.department ? ' (' + e.department + ')' : ''}`, entry && entry.employeeId === e.id)));
  const conSel = h('select', {}, ...usable.map((c) => opt(c.id, c.name, entry && entry.conceptId === c.id)));
  const qty = h('input', { type: 'number', step: '0.01', min: '0', value: entry ? entry.cantidad : '' });
  const rate = h('input', { type: 'number', step: '0.01', min: '0', placeholder: 'Tarifa del concepto', value: entry && entry.rate != null ? entry.rate : '' });
  const note = h('input', { value: entry ? entry.note || '' : '' });
  const hint = h('div', { class: 'muted', style: 'font-size:12px' });
  const preview = h('div', { class: 'strong', style: 'font-size:15px' });

  const conceptOf = () => usable.find((c) => c.id === Number(conSel.value)) || usable[0] || {};
  const refresh = () => {
    const c = conceptOf();
    hint.textContent = `${(MODES[c.modo] || {}).hint || ''} · unidad: ${c.unidad || ''}`;
    rate.placeholder = c.modo === 'porcentaje' ? `Porcentaje del concepto (${c.rate}%)` : `Tarifa del concepto (${money(Number(c.rate) || 0)})`;
    const q = Number(qty.value) || 0;
    const r = rate.value === '' ? null : Number(rate.value);
    preview.textContent = 'Importe: ' + money(compute(c, q, r));
  };
  conSel.addEventListener('change', refresh);
  qty.addEventListener('input', refresh);
  rate.addEventListener('input', refresh);
  setTimeout(refresh, 0);

  const m = modal({
    title: entry ? 'Editar captura' : 'Nueva captura de percepción',
    body: h('div', { class: 'form-grid' },
      entry ? null : field('Empleado', empSel),
      entry ? null : field('Concepto', conSel),
      entry ? h('div', { class: 'note-box' }, `${entry.employeeName} · ${entry.conceptName}`) : null,
      h('div', { class: 'form-grid two' },
        field('Cantidad', qty),
        field('Tarifa / % (opcional)', rate),
      ),
      hint,
      field('Nota / referencia', note),
      preview,
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        const payload = {
          periodId: ctx.period.id,
          cantidad: Number(qty.value) || 0,
          rate: rate.value === '' ? '' : Number(rate.value),
          note: note.value,
        };
        try {
          if (entry) {
            await api.put(`/variable-entries/${entry.id}`, payload);
          } else {
            payload.employeeId = Number(empSel.value);
            payload.conceptId = Number(conSel.value);
            if (!payload.conceptId) return toast('Selecciona un concepto', 'err');
            await api.post('/variable-entries', payload);
          }
          toast('Captura guardada', 'ok'); m.close(); reload();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
  });
}

async function deleteEntry(e) {
  if (!await confirmDialog({ title: 'Eliminar captura', message: `¿Eliminar la captura de ${e.conceptName} de ${e.employeeName}?`, confirmText: 'Eliminar' })) return;
  try { await api.delete(`/variable-entries/${e.id}`); toast('Captura eliminada', 'ok'); reload(); } catch (err) { toast(err.message, 'err'); }
}

// ---------- Modal de concepto ----------
function conceptModal(concept) {
  const name = h('input', { value: concept ? concept.name : '', placeholder: 'p. ej. Comisión sobre ventas' });
  const noiNumber = h('input', { value: concept ? concept.noiNumber : '', placeholder: 'p. ej. 2103' });
  const modo = h('select', {}, ...Object.entries(MODES).map(([v, o]) => opt(v, o.label, concept && concept.modo === v)));
  const unidad = h('input', { value: concept ? concept.unidad : '', placeholder: 'km, m², $ ventas…' });
  const rate = h('input', { type: 'number', step: '0.01', min: '0', value: concept ? concept.rate : '' });
  const department = h('input', { value: concept ? concept.department || '' : '', placeholder: 'Todas' });
  const tipo = h('select', {}, ...[['P', 'Percepción'], ['D', 'Deducción'], ['I', 'Informativo']].map(([v, l]) => opt(v, l, concept ? concept.tipo === v : v === 'P')));
  const curSource = concept ? concept.source || 'manual' : 'manual';
  const source = h('select', {}, ...ctx.sources.map((s) => opt(s.id, s.label + (s.external ? ` · ${s.status}` : ''), curSource === s.id)));
  const enabled = h('input', { type: 'checkbox' }); enabled.checked = !concept || concept.enabled !== false;
  const modeHint = h('div', { class: 'muted', style: 'font-size:12px' });
  const sourceHint = h('div', { class: 'muted', style: 'font-size:12px' });
  const syncHint = () => { modeHint.textContent = (MODES[modo.value] || {}).hint || ''; };
  const syncSrcHint = () => { const s = sourceMap()[source.value] || {}; sourceHint.textContent = s.external ? `${s.hint} · Integración en fase posterior (hoy ${s.status}).` : s.hint || ''; };
  modo.addEventListener('change', syncHint); setTimeout(syncHint, 0);
  source.addEventListener('change', syncSrcHint); setTimeout(syncSrcHint, 0);

  const m = modal({
    title: concept ? `Concepto · ${concept.name}` : 'Nuevo concepto variable',
    body: h('div', { class: 'form-grid' },
      field('Nombre', name),
      h('div', { class: 'form-grid two' }, field('No. concepto NOI', noiNumber), field('Tipo', tipo)),
      field('Forma de cálculo', modo),
      modeHint,
      h('div', { class: 'form-grid two' }, field('Unidad', unidad), field('Tarifa / porcentaje', rate)),
      field('Área sugerida (opcional)', department),
      field('Fuente de datos', source),
      sourceHint,
      h('label', { class: 'field' }, h('span', {}, 'Activo'), h('div', { class: 'checks' }, h('label', {}, enabled, ' Disponible para captura'))),
    ),
    footer: [
      h('button', { class: 'btn', onClick: () => m.close() }, 'Cancelar'),
      h('button', { class: 'btn btn-primary', onClick: async () => {
        if (!name.value || !noiNumber.value) return toast('Nombre y número NOI son obligatorios', 'err');
        const payload = {
          name: name.value, noiNumber: noiNumber.value, tipo: tipo.value,
          modo: modo.value, unidad: unidad.value, rate: Number(rate.value) || 0,
          department: department.value, source: source.value, enabled: enabled.checked,
        };
        try {
          if (concept) await api.put(`/variable-concepts/${concept.id}`, payload);
          else await api.post('/variable-concepts', payload);
          toast('Concepto guardado', 'ok'); m.close(); reload();
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Guardar'),
    ],
  });
}

async function deleteConcept(c) {
  if (!await confirmDialog({ title: 'Eliminar concepto', message: `¿Eliminar el concepto “${c.name}”? (sólo si no tiene capturas)`, confirmText: 'Eliminar' })) return;
  try { await api.delete(`/variable-concepts/${c.id}`); toast('Concepto eliminado', 'ok'); reload(); } catch (err) { toast(err.message, 'err'); }
}

function compute(concept, cantidad, rateOverride) {
  const qty = Number(cantidad) || 0;
  const rate = rateOverride != null ? Number(rateOverride) : Number(concept.rate) || 0;
  if (concept.modo === 'importe') return qty;
  if (concept.modo === 'porcentaje') return (qty * rate) / 100;
  return qty * rate;
}
function opt(value, label, selected) { const o = h('option', { value }, label); if (selected) o.selected = true; return o; }
function reload() { import('../router.js').then((r) => r.render()); }
