// Anaberries · Captura de Leads — SPA (frontend)
// Sin dependencias: fetch + DOM. El PIN del personal se guarda en localStorage.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const state = {
  pin: localStorage.getItem('staffPin') || '',
  pinRequired: false,
  authorized: false,
  pendingView: null,
};

// ---------- API ----------
async function api(path, { method = 'GET', body, staff = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (staff && state.pin) headers['x-staff-pin'] = state.pin;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* respuestas sin cuerpo */ }
  if (!res.ok) throw Object.assign(new Error(data?.error || 'Error'), { status: res.status, data });
  return data;
}

// ---------- Toast ----------
let toastTimer = null;
function toast(msg, kind = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ---------- Navegación ----------
async function goto(view) {
  if ((view === 'sorteo' || view === 'dashboard') && state.pinRequired && !state.authorized) {
    state.pendingView = view;
    openPinModal();
    return;
  }
  $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + view));
  if (view === 'sorteo') { loadPool(); loadWinners(); }
  if (view === 'dashboard') loadDashboard();
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (btn) goto(btn.dataset.view);
});

// ---------- Modal PIN ----------
function openPinModal() { $('#pin-modal').classList.remove('hidden'); $('#pin-input').value = ''; $('#pin-msg').textContent = ''; $('#pin-input').focus(); }
function closePinModal() { $('#pin-modal').classList.add('hidden'); }
$('#pin-cancel').addEventListener('click', () => { closePinModal(); goto('captura'); });
$('#pin-ok').addEventListener('click', tryPin);
$('#pin-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryPin(); });

async function tryPin() {
  state.pin = $('#pin-input').value.trim();
  try {
    const info = await api('/access', { staff: true });
    if (info.authorized) {
      state.authorized = true;
      localStorage.setItem('staffPin', state.pin);
      closePinModal();
      goto(state.pendingView || 'dashboard');
    } else {
      $('#pin-msg').textContent = 'PIN incorrecto';
      $('#pin-msg').className = 'form-msg err';
    }
  } catch { $('#pin-msg').textContent = 'No se pudo validar'; $('#pin-msg').className = 'form-msg err'; }
}

// ---------- Captura ----------
async function loadMeta() {
  const meta = await api('/leads/meta');
  if (meta.event?.name) $('#event-name').textContent = meta.event.name;
  const selI = $('#sel-interes'), filtI = $('#filter-interes');
  meta.intereses.forEach((i) => {
    selI.insertAdjacentHTML('beforeend', `<option>${escapeHtml(i)}</option>`);
    filtI.insertAdjacentHTML('beforeend', `<option>${escapeHtml(i)}</option>`);
  });
  $('#sel-fuente').innerHTML = meta.fuentes.map((f) => `<option>${escapeHtml(f)}</option>`).join('');
}

// Recuerda quién captura para no reescribirlo en cada lead.
$('#captador').value = localStorage.getItem('captador') || '';

$('#lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.consentimiento = fd.get('consentimiento') === 'on';
  body.metodoCaptura = gafete.photo ? 'gafete' : 'manual';
  if (gafete.photo) body.foto = gafete.photo;
  const msg = $('#lead-msg');
  const btn = $('#btn-guardar');
  btn.disabled = true;
  try {
    localStorage.setItem('captador', body.capturadoPor || '');
    await api('/leads', { method: 'POST', body });
    msg.textContent = '✓ Lead guardado';
    msg.className = 'form-msg ok';
    const captador = body.capturadoPor;
    form.reset();
    $('#captador').value = captador || '';
    form.querySelector('[name=consentimiento]').checked = true;
    resetGafete();
    form.querySelector('[name=nombre]').focus();
    refreshRecent();
  } catch (err) {
    if (err.status === 409) {
      if (confirm(`${err.data?.error}. ¿Guardar de todas formas?`)) {
        body.forzar = true;
        try { await api('/leads', { method: 'POST', body }); msg.textContent = '✓ Lead guardado'; msg.className = 'form-msg ok'; form.reset(); $('#captador').value = body.capturadoPor || ''; resetGafete(); refreshRecent(); }
        catch (e2) { msg.textContent = e2.message; msg.className = 'form-msg err'; }
      }
    } else {
      msg.textContent = err.message || 'No se pudo guardar';
      msg.className = 'form-msg err';
    }
  } finally { btn.disabled = false; }
});

async function refreshRecent() {
  // El listado requiere personal; si hay PIN y aún no se autoriza, no lo pedimos.
  if (state.pinRequired && !state.authorized) {
    $('#recent-list').innerHTML = '<li class="muted">Ingresa el PIN del personal para ver registros.</li>';
    return;
  }
  try {
    const data = await api('/leads', { staff: true });
    $('#cap-count').textContent = data.total;
    const recent = data.items.slice(0, 6);
    $('#recent-list').innerHTML = recent.length
      ? recent.map((l) => `<li><strong>${escapeHtml(l.nombre)}</strong><small>${escapeHtml(l.empresa || l.interes || '')} · ${fmtDate(l.createdAt)}</small></li>`).join('')
      : '<li class="muted">Aún no hay registros.</li>';
  } catch (err) {
    if (err.status === 401) {
      // Con PIN activo aún sin autorizar: mostramos solo el contador vía otro medio.
      $('#recent-list').innerHTML = '<li class="muted">Ingresa el PIN del personal para ver registros.</li>';
    }
  }
}

// ---------- Captura por foto del gafete (OCR con Tesseract) ----------
const gafete = { mode: 'manual', photo: null, stream: null, worker: null };

// Cambio de modo Manual / Gafete.
$('#mode-seg').addEventListener('click', (e) => {
  const btn = e.target.closest('.mode-btn');
  if (!btn) return;
  gafete.mode = btn.dataset.mode;
  $$('.mode-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
  const panel = $('#gafete-panel');
  if (gafete.mode === 'gafete') { panel.hidden = false; }
  else { panel.hidden = true; stopCamera(); }
});

// Detección de soporte WASM SIMD para elegir el core adecuado (ambos vendorizados).
function simdSupported() {
  try {
    return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
  } catch { return false; }
}

// Dibuja una imagen/vídeo a un canvas reescalado y devuelve el dataURL JPEG.
function toDataUrl(source, sw, sh, maxW = 1400) {
  const scale = Math.min(1, maxW / sw);
  const canvas = $('#cam-canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function showPhoto(dataUrl) {
  gafete.photo = dataUrl;
  const img = $('#cam-photo');
  img.src = dataUrl; img.hidden = false;
  $('#cam-video').hidden = true;
  $('#gafete-hint').hidden = true;
  $('#btn-cam-shot').hidden = true;
  $('#btn-cam-start').hidden = true;
  $('#btn-cam-retake').hidden = false;
  $('#btn-ocr').hidden = false;
}

async function startCamera() {
  try {
    gafete.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const v = $('#cam-video');
    v.srcObject = gafete.stream; v.hidden = false;
    $('#gafete-hint').hidden = true;
    $('#cam-photo').hidden = true;
    $('#btn-cam-start').hidden = true;
    $('#btn-cam-shot').hidden = false;
    $('#btn-cam-retake').hidden = true;
    $('#btn-ocr').hidden = true;
  } catch {
    toast('No se pudo abrir la cámara. Usa «Subir imagen».', 'err');
  }
}
function stopCamera() {
  if (gafete.stream) { gafete.stream.getTracks().forEach((t) => t.stop()); gafete.stream = null; }
  $('#cam-video').hidden = true;
}
function resetGafete() {
  gafete.photo = null;
  stopCamera();
  $('#cam-photo').hidden = true;
  $('#cam-photo').removeAttribute('src');
  $('#gafete-hint').hidden = false;
  $('#btn-cam-start').hidden = false;
  $('#btn-cam-shot').hidden = true;
  $('#btn-cam-retake').hidden = true;
  $('#btn-ocr').hidden = true;
  $('#ocr-progress').hidden = true;
  $('#ocr-bar-fill').style.width = '0';
}

$('#btn-cam-start').addEventListener('click', startCamera);
$('#btn-cam-retake').addEventListener('click', () => { resetGafete(); startCamera(); });
$('#btn-cam-shot').addEventListener('click', () => {
  const v = $('#cam-video');
  if (!v.videoWidth) return;
  const url = toDataUrl(v, v.videoWidth, v.videoHeight);
  stopCamera();
  showPhoto(url);
});
$('#cam-file').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => { showPhoto(toDataUrl(img, img.naturalWidth, img.naturalHeight)); };
  img.src = URL.createObjectURL(file);
});

function setOcrProgress(p, label) {
  $('#ocr-progress').hidden = false;
  $('#ocr-bar-fill').style.width = Math.round((p || 0) * 100) + '%';
  if (label) $('#ocr-status').textContent = label;
}

async function getWorker() {
  if (gafete.worker) return gafete.worker;
  if (typeof Tesseract === 'undefined') throw new Error('Motor OCR no disponible');
  const core = simdSupported() ? 'tesseract-core-simd-lstm.wasm.js' : 'tesseract-core-lstm.wasm.js';
  gafete.worker = await Tesseract.createWorker('spa+eng', 1, {
    workerPath: '/vendor/tesseract/worker.min.js',
    corePath: '/vendor/tesseract/core/' + core,
    langPath: '/vendor/tesseract/lang',
    workerBlobURL: false,
    logger: (m) => { if (m.status === 'recognizing text') setOcrProgress(m.progress, 'Leyendo gafete…'); },
  });
  return gafete.worker;
}

// Heurística para extraer datos del texto del gafete.
function parseBadge(text) {
  const raw = text.replace(/\r/g, '').trim();
  const allLines = raw.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const email = (raw.match(emailRe) || [''])[0].toLowerCase();

  // Teléfono: secuencia con 10+ dígitos.
  let telefono = '';
  for (const l of allLines) {
    const digits = (l.match(/\d/g) || []).length;
    if (digits >= 10 && /[\d][\d\s().+-]{8,}[\d]/.test(l)) { telefono = l.replace(/[^\d+]/g, '').slice(-13); break; }
  }

  // Líneas de ruido: banners del evento, roles, años.
  const noiseRe = /\b(expo|anaberries|gafete|visitante|expositor|ponente|congreso|feria|foro|stand|booth|badge|welcome|bienvenid)\b|\b(19|20)\d{2}\b/i;
  const esContacto = (l) => emailRe.test(l) || (telefono && l.replace(/[^\d+]/g, '').slice(-13) === telefono) || /@|www\.|http|\.com|\.mx|\.org/i.test(l);
  const candidatas = allLines.filter((l) => !noiseRe.test(l) && !esContacto(l));

  // Nombre: 2-4 palabras alfabéticas, sin marcadores de empresa.
  const empresaFuerte = /(S\.?\s?A\.?(\s+de\s+C\.?\s?V\.?)?|S\.\s?de\s?R\.?L\.?|de\s+C\.?\s?V\.?|\bS\.?P\.?R\.?\b)/i;
  const empresaClave = /(Agr[ií]cola|Rancho|Invernaderos?|Berries|Frut[ií]cola|Hortalizas|Cultivos|Campo|Agro\w*|Comercializadora|Grupo|Productora|Exporta\w*|Viveros?|Empaque\w*|Distribuidora|Semillas)/i;
  const pareceNombre = (l) => {
    const words = l.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-zÁÉÍÓÚÑáéíóúñ.'\- ]+$/.test(l)
      && !empresaFuerte.test(l) && !empresaClave.test(l) && l.length >= 5 && l.length <= 40;
  };
  let nombre = candidatas.find(pareceNombre) || '';

  // Empresa: puntúa candidatas (marcador legal = 2, palabra clave = 1) y elige la mayor.
  let empresa = '';
  let mejor = 0;
  const idxNombre = nombre ? candidatas.indexOf(nombre) : -1;
  candidatas.forEach((l, i) => {
    if (l === nombre || l.length > 70) return;
    let score = (empresaFuerte.test(l) ? 2 : 0) + (empresaClave.test(l) ? 1 : 0);
    if (score > 0 && idxNombre >= 0 && i === idxNombre + 1) score += 1; // suele ir bajo el nombre
    if (score > mejor) { mejor = score; empresa = l; }
  });
  // Si no hubo señales, toma la línea inmediatamente posterior al nombre.
  if (!empresa && idxNombre >= 0 && candidatas[idxNombre + 1]) {
    const sig = candidatas[idxNombre + 1];
    if (sig.length >= 3 && sig.length <= 70) empresa = sig;
  }

  return { nombre, empresa, email, telefono, raw };
}

function fillField(name, value) {
  if (!value) return false;
  const el = document.querySelector(`#lead-form [name=${name}]`);
  if (el && !el.value) { el.value = value; el.classList.add('ocr-filled'); setTimeout(() => el.classList.remove('ocr-filled'), 1200); return true; }
  return false;
}

$('#btn-ocr').addEventListener('click', async () => {
  if (!gafete.photo) return;
  const btn = $('#btn-ocr');
  btn.disabled = true;
  setOcrProgress(0.05, 'Iniciando OCR…');
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(gafete.photo);
    const parsed = parseBadge(data.text || '');
    let filled = 0;
    filled += fillField('nombre', parsed.nombre) ? 1 : 0;
    filled += fillField('empresa', parsed.empresa) ? 1 : 0;
    filled += fillField('email', parsed.email) ? 1 : 0;
    filled += fillField('telefono', parsed.telefono) ? 1 : 0;
    // Texto reconocido a Notas, para verificación manual.
    const notas = document.querySelector('#lead-form [name=notas]');
    if (notas && !notas.value && parsed.raw) notas.value = 'OCR gafete:\n' + parsed.raw.slice(0, 400);
    setOcrProgress(1, filled ? `Se llenaron ${filled} campo(s). Revisa y corrige.` : 'No se detectaron datos claros. Captura manual.');
    document.querySelector('#lead-form [name=nombre]').focus();
    toast(filled ? `Datos extraídos (${filled})` : 'Sin datos claros; revisa la foto', filled ? 'ok' : 'err');
  } catch (err) {
    setOcrProgress(0, 'Error de OCR');
    toast(err.message || 'No se pudo leer el gafete', 'err');
  } finally { btn.disabled = false; }
});

// ---------- Sorteo ----------
function raffleOpts() {
  return { consentimiento: $('#opt-consent').checked ? '1' : '0', repetidos: $('#opt-repes').checked ? '1' : '0' };
}
async function loadPool() {
  try {
    const o = raffleOpts();
    const data = await api(`/raffle/eligible?consentimiento=${o.consentimiento}&repetidos=${o.repetidos}`, { staff: true });
    $('#pool-count').textContent = data.total;
  } catch { /* sin acceso */ }
}
$('#opt-consent').addEventListener('change', loadPool);
$('#opt-repes').addEventListener('change', loadPool);

$('#btn-sortear').addEventListener('click', async () => {
  const btn = $('#btn-sortear');
  const reel = $('#reel');
  btn.disabled = true;
  reel.className = 'reel spinning';
  const nombres = ['🎲', '🎁', '⭐', '🎉', '🏆', '🎊'];
  let i = 0;
  const spin = setInterval(() => { reel.textContent = nombres[i++ % nombres.length]; }, 120);
  try {
    // Pequeña espera para la animación.
    await new Promise((r) => setTimeout(r, 1400));
    const body = {
      premio: $('#premio').value.trim(),
      soloConsentimiento: $('#opt-consent').checked,
      evitarRepetidos: $('#opt-repes').checked,
    };
    const { ganador } = await api('/raffle/draw', { method: 'POST', body, staff: true });
    clearInterval(spin);
    reel.className = 'reel winner';
    reel.innerHTML = `<span class="win-name">🏆 ${escapeHtml(ganador.nombre)}</span>` +
      (ganador.empresa ? `<span class="win-empresa">${escapeHtml(ganador.empresa)}</span>` : '') +
      `<span class="win-premio">${escapeHtml(ganador.premio)}</span>`;
    toast('¡Tenemos ganador!', 'ok');
    loadWinners();
    loadPool();
  } catch (err) {
    clearInterval(spin);
    reel.className = 'reel';
    reel.textContent = '🎉';
    toast(err.message || 'No se pudo sortear', 'err');
  } finally { btn.disabled = false; }
});

async function loadWinners() {
  try {
    const { items } = await api('/raffle/winners', { staff: true });
    $('#winners-list').innerHTML = items.length
      ? items.map((w) => `<li><button class="del" data-id="${w.id}" title="Anular">✕</button><strong>${escapeHtml(w.nombre)}</strong><span class="prize">${escapeHtml(w.premio)}</span><small>${escapeHtml(w.empresa || '')} · ${fmtDate(w.createdAt)}</small></li>`).join('')
      : '<li class="muted">Aún no hay ganadores.</li>';
  } catch { /* sin acceso */ }
}
$('#winners-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.del');
  if (!btn) return;
  if (!confirm('¿Anular este sorteo?')) return;
  try { await api('/raffle/winners/' + btn.dataset.id, { method: 'DELETE', staff: true }); loadWinners(); loadPool(); }
  catch (err) { toast(err.message, 'err'); }
});

// ---------- Dashboard ----------
function barList(el, items) {
  if (!items || !items.length) { el.innerHTML = '<div class="empty">Sin datos aún.</div>'; return; }
  const max = Math.max(...items.map((i) => i.value));
  el.innerHTML = items.map((i) => `
    <div class="bar-row">
      <span class="bl" title="${escapeHtml(i.label)}">${escapeHtml(i.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${max ? (i.value / max) * 100 : 0}%"></span></span>
      <span class="bv">${i.value}</span>
    </div>`).join('');
}

async function loadDashboard() {
  try {
    const s = await api('/stats', { staff: true });
    $('#kpis').innerHTML = [
      { v: s.total, l: 'Leads totales', accent: true },
      { v: s.hoy, l: 'Capturados hoy' },
      { v: s.conConsentimiento, l: 'Con consentimiento' },
      { v: s.tasaConsentimiento + '%', l: 'Tasa consentimiento' },
      { v: s.ganadores, l: 'Ganadores sorteo' },
    ].map((k) => `<div class="kpi"><div class="v ${k.accent ? 'accent' : ''}">${k.v}</div><div class="l">${k.l}</div></div>`).join('');
    barList($('#bars-interes'), s.porInteres);
    barList($('#bars-fuente'), s.porFuente);
    barList($('#bars-timeline'), s.timeline);
    barList($('#bars-captador'), s.porCaptador);
    loadLeadsTable();
  } catch (err) { if (err.status !== 401) toast(err.message, 'err'); }
}

let searchTimer = null;
async function loadLeadsTable() {
  const q = $('#search').value.trim();
  const interes = $('#filter-interes').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (interes) params.set('interes', interes);
  try {
    const data = await api('/leads?' + params.toString(), { staff: true });
    $('#leads-tbody').innerHTML = data.items.length
      ? data.items.map((l) => `
        <tr>
          <td><strong>${escapeHtml(l.nombre)}</strong>${l.tieneFoto ? `<a class="badge-cam" href="/api/leads/${l.id}/badge${state.pin ? '?pin=' + encodeURIComponent(state.pin) : ''}" target="_blank" title="Foto del gafete">📷</a>` : ''}${l.cargo ? `<div class="contact">${escapeHtml(l.cargo)}</div>` : ''}</td>
          <td>${escapeHtml(l.empresa || '—')}</td>
          <td class="contact">${escapeHtml(l.telefono || '')}${l.telefono && l.email ? '<br>' : ''}${escapeHtml(l.email || '')}</td>
          <td><span class="tag">${escapeHtml(l.interes || '—')}</span></td>
          <td>${escapeHtml(l.fuente || '')}</td>
          <td class="contact">${fmtDate(l.createdAt)}</td>
          <td><button class="del-lead" data-id="${l.id}" title="Eliminar">🗑</button></td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="empty">No hay leads que coincidan.</td></tr>';
  } catch (err) { if (err.status !== 401) toast(err.message, 'err'); }
}

$('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadLeadsTable, 250); });
$('#filter-interes').addEventListener('change', loadLeadsTable);
$('#btn-refresh').addEventListener('click', loadDashboard);
$('#leads-tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('.del-lead');
  if (!btn) return;
  if (!confirm('¿Eliminar este lead?')) return;
  try { await api('/leads/' + btn.dataset.id, { method: 'DELETE', staff: true }); loadDashboard(); refreshRecent(); toast('Lead eliminado', 'ok'); }
  catch (err) { toast(err.message, 'err'); }
});

$('#btn-export').addEventListener('click', (e) => {
  e.preventDefault();
  const url = '/api/leads/export.csv' + (state.pin ? '?pin=' + encodeURIComponent(state.pin) : '');
  window.open(url, '_blank');
});

// ---------- Init ----------
(async function init() {
  try {
    const info = await api('/access', { staff: true });
    state.pinRequired = info.pinRequired;
    state.authorized = info.authorized;
  } catch { /* endpoint siempre responde */ }
  await loadMeta();
  refreshRecent();
})();
