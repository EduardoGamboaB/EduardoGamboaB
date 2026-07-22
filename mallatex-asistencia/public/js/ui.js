// Helpers de UI: creación de elementos, formato, badges, modal y toasts.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

// ---------- Formato ----------
export function fmtDate(iso, opts) {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
  return d.toLocaleDateString('es-MX', opts || { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function fmtDow(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'short' });
}
export function fmtHours(minutes) {
  if (!minutes) return '0.00 h';
  return (minutes / 60).toFixed(2) + ' h';
}
export function money(n) { return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
export function initials(name) { return (name || '?').split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase(); }

// ---------- Estatus de asistencia → badge ----------
export const STATUS_META = {
  asistencia: { label: 'Asistencia', cls: 'b-ok' },
  retardo: { label: 'Retardo', cls: 'b-warn' },
  falta: { label: 'Falta', cls: 'b-err' },
  omision: { label: 'Omisión', cls: 'b-warn' },
  justificada: { label: 'Justificada', cls: 'b-info' },
  vacaciones: { label: 'Vacaciones', cls: 'b-purple' },
  permiso: { label: 'Permiso', cls: 'b-info' },
  incapacidad: { label: 'Incapacidad', cls: 'b-purple' },
  descanso: { label: 'Descanso', cls: 'b-gray' },
  festivo: { label: 'Festivo', cls: 'b-gray' },
  pendiente: { label: 'Pendiente', cls: 'b-gray' },
};
export function statusBadge(status) {
  const m = STATUS_META[status] || { label: status, cls: 'b-gray' };
  return h('span', { class: `badge ${m.cls}` }, m.label);
}
export function stateBadge(state) {
  const map = {
    pendiente: 'b-warn', autorizada: 'b-ok', rechazada: 'b-err',
    abierto: 'b-info', cerrado: 'b-gray',
  };
  const labels = { pendiente: 'Pendiente', autorizada: 'Autorizada', rechazada: 'Rechazada', abierto: 'Abierto', cerrado: 'Cerrado' };
  return h('span', { class: `badge ${map[state] || 'b-gray'}` }, labels[state] || state);
}

// ---------- Toast ----------
export function toast(msg, type = 'ok') {
  const root = document.getElementById('toast-root');
  const t = h('div', { class: `toast ${type}` }, msg);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 250); }, 3200);
}

// ---------- Modal ----------
export function modal({ title, body, footer, size }) {
  const root = document.getElementById('modal-root');
  const close = () => clear(root);
  const backdrop = h('div', { class: 'modal-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } },
    h('div', { class: `modal ${size || ''}` },
      h('div', { class: 'modal-head' }, h('h3', {}, title), h('button', { class: 'icon-btn', onClick: close }, '✕')),
      h('div', { class: 'modal-body' }, body),
      footer ? h('div', { class: 'modal-foot' }, footer) : null,
    ),
  );
  clear(root).appendChild(backdrop);
  return { close };
}

export function confirmDialog({ title, message, confirmText = 'Confirmar', danger }) {
  return new Promise((resolve) => {
    const m = modal({
      title,
      body: h('p', { class: 'muted' }, message),
      footer: [
        h('button', { class: 'btn', onClick: () => { m.close(); resolve(false); } }, 'Cancelar'),
        h('button', { class: `btn ${danger ? 'btn-danger' : 'btn-primary'}`, onClick: () => { m.close(); resolve(true); } }, confirmText),
      ],
    });
  });
}

export function field(labelText, control, hint) {
  return h('label', { class: 'field' }, h('span', {}, labelText, hint ? h('small', {}, ' · ' + hint) : null), control);
}

export function option(value, label, selected) {
  const o = h('option', { value }, label);
  if (selected) o.selected = true;
  return o;
}

export function empty(icon, text) {
  return h('div', { class: 'empty' }, h('div', { class: 'big' }, icon), h('div', {}, text));
}
