// Anaberries · Captura de Leads — SPA (frontend)
// Sin dependencias: fetch + DOM. El PIN del personal se guarda en localStorage.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

const state = {
  token: localStorage.getItem('authToken') || '',
  user: null,
};

// ---------- API ----------
async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* respuestas sin cuerpo */ }
  if (res.status === 401 && state.user) { logout(); }
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
  $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.view === view));
  $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + view));
  if (view === 'sorteo') loadSorteo();
  if (view === 'dashboard') loadDashboard();
  if (view === 'evento') loadEventoAdmin();
  if (view === 'usuarios') loadUsuarios();
}

$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (btn) goto(btn.dataset.view);
});

// ---------- Sesión / Login ----------
function showLogin() {
  $('#login-screen').classList.remove('hidden');
  $('#app-shell').classList.add('hidden');
}
function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app-shell').classList.remove('hidden');
  const isSetup = !!(state.user && state.user.setup);
  $('#user-name').textContent = state.user ? state.user.name : '';
  $('#tab-usuarios').hidden = !(state.user && state.user.role === 'admin');
  $('#setup-banner').hidden = !isSetup;
}
function logout() {
  state.token = ''; state.user = null;
  localStorage.removeItem('authToken');
  $('#setup-banner').hidden = true;
  showLogin();
}
$('#btn-logout')?.addEventListener('click', logout);

// ---------- Configuración inicial por NIP ----------
// Muestra la entrada por NIP solo si el servidor la tiene habilitada.
async function checkSetupAvailability() {
  try {
    const r = await fetch('/api/auth/setup-status');
    const s = await r.json().catch(() => ({}));
    $('#login-setup').hidden = !s.available;
  } catch { $('#login-setup').hidden = true; }
}

$('#setup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $('#setup-error');
  const btn = $('#btn-setup');
  err.textContent = '';
  btn.disabled = true;
  try {
    const r = await fetch('/api/auth/setup-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: f.pin.value.trim() }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'No se pudo entrar');
    state.token = data.token; state.user = data.user;
    localStorage.setItem('authToken', state.token);
    showApp();
    await startApp();
    goto('usuarios');
  } catch (e2) {
    err.textContent = e2.message || 'NIP incorrecto';
  } finally { btn.disabled = false; }
});

$('#btn-finish-setup')?.addEventListener('click', async () => {
  if (!confirm('¿Finalizar la configuración inicial? El acceso por NIP quedará desactivado.')) return;
  try {
    await api('/auth/setup-complete', { method: 'POST' });
    toast('Configuración finalizada. Inicia sesión con tu usuario.', 'ok');
    logout();
  } catch (err) { toast(err.message || 'No se pudo finalizar', 'err'); }
});

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const err = $('#login-error');
  const btn = $('#btn-login');
  err.textContent = '';
  btn.disabled = true;
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: f.email.value.trim(), password: f.password.value }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'No se pudo iniciar sesión');
    state.token = data.token; state.user = data.user;
    localStorage.setItem('authToken', state.token);
    showApp();
    await startApp();
    goto('captura');
  } catch (e2) {
    err.textContent = e2.message || 'Error al iniciar sesión';
  } finally { btn.disabled = false; }
});

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
  const okGuardado = (saved) => {
    msg.innerHTML = `✓ Lead guardado — Folio del lead: <b>${escapeHtml(saved && saved.folio || '')}</b>`
      + `<br><span class="nota-gafete">Verifica que los datos coincidan con el gafete de registro del visitante.</span>`;
    msg.className = 'form-msg ok';
  };
  try {
    localStorage.setItem('captador', body.capturadoPor || '');
    const saved = await api('/leads', { method: 'POST', body });
    okGuardado(saved);
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
        try { const saved2 = await api('/leads', { method: 'POST', body }); okGuardado(saved2); form.reset(); $('#captador').value = body.capturadoPor || ''; resetGafete(); refreshRecent(); }
        catch (e2) { msg.textContent = e2.message; msg.className = 'form-msg err'; }
      }
    } else {
      msg.textContent = err.message || 'No se pudo guardar';
      msg.className = 'form-msg err';
    }
  } finally { btn.disabled = false; }
});

async function refreshRecent() {
  try {
    const data = await api('/leads');
    $('#cap-count').textContent = data.total;
    const recent = data.items.slice(0, 6);
    $('#recent-list').innerHTML = recent.length
      ? recent.map((l) => `<li><strong>${escapeHtml(l.nombre)}</strong><small>${escapeHtml(l.empresa || l.interes || '')} · ${fmtDate(l.createdAt)}</small></li>`).join('')
      : '<li class="muted">Aún no hay registros.</li>';
  } catch { /* sin sesión */ }
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

// ---------- Eventos (estado compartido) ----------
const eventos = { list: [], activeId: '', selectedId: '', premioImagen: undefined };
// Nombre del evento por id (para la tabla del dashboard).
function nombreEvento(id) { const e = eventos.list.find((x) => x.id === id); return e ? e.name : '—'; }

async function loadEventos() {
  try {
    const data = await api('/events', { staff: true });
    eventos.list = data.items || [];
    eventos.activeId = data.activeEventId || (eventos.list[0] && eventos.list[0].id) || '';
    const activo = eventos.list.find((e) => e.id === eventos.activeId);
    if (activo) $('#event-name').textContent = activo.name;
    poblarSelectoresEvento();
    return true;
  } catch (err) { if (err.status !== 401) toast(err.message, 'err'); return false; }
}

function poblarSelectoresEvento() {
  // Selector del dashboard (con "Todos").
  const dash = $('#dash-evento');
  if (dash) {
    const prev = dash.value;
    dash.innerHTML = '<option value="">Todos los eventos</option>' +
      eventos.list.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}${e.id === eventos.activeId ? ' ★' : ''}</option>`).join('');
    dash.value = eventos.list.some((e) => e.id === prev) ? prev : '';
  }
  // Selector de administración.
  const sel = $('#evento-select');
  if (sel) {
    sel.innerHTML = eventos.list.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}${e.id === eventos.activeId ? ' ★ (activo)' : ''}${e.finalizado ? ' · finalizado' : ''}</option>`).join('');
    if (!eventos.list.some((e) => e.id === eventos.selectedId)) eventos.selectedId = eventos.activeId;
    sel.value = eventos.selectedId;
  }
  // Selector del sorteo (solo eventos NO finalizados).
  const sor = $('#sorteo-evento-sel');
  if (sor) {
    const vigentes = eventos.list.filter((e) => !e.finalizado);
    const prev = sor.value;
    sor.innerHTML = vigentes.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}${e.id === eventos.activeId ? ' ★ (activo)' : ''}</option>`).join('')
      || '<option value="">— sin eventos vigentes —</option>';
    sor.value = vigentes.some((e) => e.id === prev) ? prev : (vigentes.some((e) => e.id === eventos.activeId) ? eventos.activeId : (vigentes[0] && vigentes[0].id) || '');
  }
}

// Evento del sorteo: refleja EXACTAMENTE el selector (vacío = sin evento vigente).
// No cae al evento activo, para no sortear en un evento finalizado.
function sorteoEventId() { const s = $('#sorteo-evento-sel'); return s ? s.value : (eventos.activeId || ''); }

// Habilita/inhabilita los controles del sorteo según haya (o no) evento vigente.
function setSorteoDisponible(vigente) {
  const sortear = $('#btn-sortear'); const fin = $('#btn-finalizar-evento');
  if (sortear) { sortear.disabled = !vigente; sortear.title = vigente ? '' : 'No hay un evento vigente para sortear'; }
  if (fin) fin.disabled = !vigente;
}

// ---------- Sorteo ----------
function raffleOpts() {
  return { consentimiento: $('#opt-consent').checked ? '1' : '0', repetidos: $('#opt-repes').checked ? '1' : '0' };
}
async function loadSorteo() {
  await loadEventos();
  const ev = eventos.list.find((e) => e.id === sorteoEventId());
  if (ev && ev.premio) $('#premio').value = ev.premio;
  await loadPool();
  await loadWinners();
  renderHistorico();
}
async function loadPool() {
  try {
    const o = raffleOpts();
    const data = await api(`/raffle/eligible?event=${encodeURIComponent(sorteoEventId())}&consentimiento=${o.consentimiento}&repetidos=${o.repetidos}`);
    const vigente = data.vigente !== false && !!sorteoEventId();
    setSorteoDisponible(vigente);
    $('#pool-count').textContent = data.total;
    if (!vigente) {
      $('#sorteo-correo').textContent = '⚠ No hay un evento vigente. Activa o crea un evento (pestaña Evento) para poder sortear.';
    } else {
      $('#sorteo-correo').textContent = data.correoActivo
        ? '✉ El ganador recibirá su folio por correo automáticamente.'
        : '✉ Envío de correo no configurado: entrega el folio manualmente (o configura SMTP).';
    }
  } catch { /* sin acceso */ }
}
$('#opt-consent').addEventListener('change', loadPool);
$('#opt-repes').addEventListener('change', loadPool);
$('#sorteo-evento-sel')?.addEventListener('change', async () => {
  const ev = eventos.list.find((e) => e.id === sorteoEventId());
  $('#premio').value = ev && ev.premio ? ev.premio : '';
  $('#reel').className = 'reel'; $('#reel').textContent = '🎉';
  await loadPool(); await loadWinners();
});

// Marca el evento del sorteo como finalizado.
$('#btn-finalizar-evento')?.addEventListener('click', async () => {
  const id = sorteoEventId();
  if (!id) return;
  const ev = eventos.list.find((e) => e.id === id);
  if (!confirm(`¿Finalizar el evento "${ev ? ev.name : ''}"? Pasará al histórico y ya no aparecerá para sortear.`)) return;
  try {
    await api('/events/' + id + '/finalizar', { method: 'POST' });
    toast('Evento finalizado', 'ok');
    await loadSorteo();
  } catch (err) { toast(err.message, 'err'); }
});

// Histórico de eventos finalizados con su ganador.
async function renderHistorico() {
  const cont = $('#historico-list');
  const finalizados = eventos.list.filter((e) => e.finalizado);
  if (!finalizados.length) { cont.innerHTML = '<p class="muted">No hay eventos finalizados.</p>'; return; }
  const partes = await Promise.all(finalizados.map(async (e) => {
    let ganadores = [];
    try { ganadores = (await api('/raffle/winners?event=' + encodeURIComponent(e.id))).items || []; } catch { /* */ }
    const detalle = [e.tipo, e.edition, e.lugar].filter(Boolean).join(' · ');
    const fecha = e.fecha ? `${e.fecha}${e.hora ? ' ' + e.hora : ''}` : '';
    const gan = ganadores.length
      ? ganadores.map((w) => `<div class="gan">🏆 <b>${escapeHtml(w.nombre)}</b> — ${escapeHtml(w.premio)} · Folio <b>${escapeHtml(w.folio || '—')}</b></div>`).join('')
      : '<div class="gan muted">Sin ganador registrado.</div>';
    return `<div class="historico-item">
      <h4>${escapeHtml(e.name)}<span class="badge-fin">finalizado</span></h4>
      <div class="meta">${escapeHtml(detalle || '—')}${fecha ? ' · Sorteo: ' + escapeHtml(fecha) : ''} · ${escapeHtml(e.premio || '')}</div>
      ${gan}
    </div>`;
  }));
  cont.innerHTML = partes.join('');
}

$('#btn-sortear').addEventListener('click', async () => {
  const btn = $('#btn-sortear');
  const reel = $('#reel');
  if (!sorteoEventId()) { toast('No hay un evento vigente para sortear. Activa o crea un evento.', 'err'); return; }
  btn.disabled = true;
  reel.className = 'reel spinning';
  const nombres = ['🎲', '🎁', '⭐', '🎉', '🏆', '🎊'];
  let i = 0;
  const spin = setInterval(() => { reel.textContent = nombres[i++ % nombres.length]; }, 120);
  try {
    await new Promise((r) => setTimeout(r, 1400));
    const body = {
      event: sorteoEventId(),
      premio: $('#premio').value.trim(),
      soloConsentimiento: $('#opt-consent').checked,
      evitarRepetidos: $('#opt-repes').checked,
    };
    const { ganador } = await api('/raffle/draw', { method: 'POST', body });
    clearInterval(spin);
    reel.className = 'reel winner';
    reel.innerHTML = `<span class="win-name">🏆 ${escapeHtml(ganador.nombre)}</span>` +
      (ganador.empresa ? `<span class="win-empresa">${escapeHtml(ganador.empresa)}</span>` : '') +
      `<span class="win-premio">${escapeHtml(ganador.premio)}</span>` +
      `<span class="win-folio">Folio: <b>${escapeHtml(ganador.folio)}</b></span>`;
    const est = ganador.emailEstado === 'enviado' ? 'Folio enviado por correo ✓'
      : ganador.emailEstado === 'omitido' ? 'Entrega el folio manualmente' : 'No se pudo enviar el correo';
    toast('¡Ganador! ' + est, ganador.emailEstado === 'error' ? 'err' : 'ok');
    loadWinners();
    loadPool();
  } catch (err) {
    clearInterval(spin);
    reel.className = 'reel';
    reel.textContent = '🎉';
    toast(err.message || 'No se pudo sortear', 'err');
  } finally { btn.disabled = false; }
});

function emailBadge(w) {
  if (w.emailEstado === 'enviado') return '<span class="mail ok" title="Folio enviado por correo">✉ enviado</span>';
  if (w.emailEstado === 'error') return '<span class="mail err" title="Error al enviar">✉ error</span>';
  return '<span class="mail" title="Correo no enviado">✉ pendiente</span>';
}
async function loadWinners() {
  try {
    const { items } = await api(`/raffle/winners?event=${encodeURIComponent(sorteoEventId())}`);
    $('#winners-list').innerHTML = items.length
      ? items.map((w) => `<li>
          <button class="del" data-id="${w.id}" title="Anular">✕</button>
          <strong>${escapeHtml(w.nombre)}</strong>
          <span class="prize">${escapeHtml(w.premio)}</span>
          <span class="folio">Folio: <b>${escapeHtml(w.folio || '—')}</b></span>
          <small>${escapeHtml(w.empresa || '')} · ${fmtDate(w.createdAt)}</small>
          <div class="win-actions">${emailBadge(w)}<button class="resend" data-id="${w.id}" title="Reenviar correo">Reenviar</button></div>
        </li>`).join('')
      : '<li class="muted">Aún no hay ganadores.</li>';
  } catch { /* sin acceso */ }
}
$('#winners-list').addEventListener('click', async (e) => {
  const del = e.target.closest('.del');
  const resend = e.target.closest('.resend');
  if (del) {
    if (!confirm('¿Anular este sorteo?')) return;
    try { await api('/raffle/winners/' + del.dataset.id, { method: 'DELETE', staff: true }); loadWinners(); loadPool(); }
    catch (err) { toast(err.message, 'err'); }
  } else if (resend) {
    try { const r = await api('/raffle/winners/' + resend.dataset.id + '/resend', { method: 'POST', staff: true }); toast(r.estado === 'enviado' ? 'Correo reenviado ✓' : 'No se envió (revisa SMTP)', r.estado === 'enviado' ? 'ok' : 'err'); loadWinners(); }
    catch (err) { toast(err.message, 'err'); }
  }
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

function dashEvent() { return $('#dash-evento') ? $('#dash-evento').value : ''; }
async function loadDashboard() {
  await loadEventos();
  try {
    const ev = dashEvent();
    const s = await api('/stats' + (ev ? '?event=' + encodeURIComponent(ev) : ''), { staff: true });
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
  if (dashEvent()) params.set('event', dashEvent());
  if (q) params.set('q', q);
  if (interes) params.set('interes', interes);
  try {
    const data = await api('/leads?' + params.toString(), { staff: true });
    $('#leads-tbody').innerHTML = data.items.length
      ? data.items.map((l) => `
        <tr>
          <td><strong>${escapeHtml(l.nombre)}</strong>${l.tieneFoto ? `<a class="badge-cam" href="/api/leads/${l.id}/badge${state.token ? '?token=' + encodeURIComponent(state.token) : ''}" target="_blank" title="Foto del gafete">📷</a>` : ''}${l.cargo ? `<div class="contact">${escapeHtml(l.cargo)}</div>` : ''}</td>
          <td>${escapeHtml(l.empresa || '—')}</td>
          <td class="contact">${escapeHtml(l.telefono || '')}${l.telefono && l.email ? '<br>' : ''}${escapeHtml(l.email || '')}</td>
          <td><span class="tag">${escapeHtml(l.interes || '—')}</span></td>
          <td>${escapeHtml(l.fuente || '')}</td>
          <td>${escapeHtml(nombreEvento(l.eventId))}</td>
          <td class="contact">${fmtDate(l.createdAt)}</td>
          <td><button class="del-lead" data-id="${l.id}" title="Eliminar">🗑</button></td>
        </tr>`).join('')
      : '<tr><td colspan="8" class="empty">No hay leads que coincidan.</td></tr>';
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

$('#dash-evento')?.addEventListener('change', loadDashboard);
$('#btn-export').addEventListener('click', (e) => {
  e.preventDefault();
  const p = new URLSearchParams();
  if (state.token) p.set('token', state.token);
  if (dashEvent()) p.set('event', dashEvent());
  window.open('/api/leads/export.csv' + (p.toString() ? '?' + p.toString() : ''), '_blank');
});

// ---------- Evento (administración multi-evento) ----------
async function loadEventoAdmin() {
  const ok = await loadEventos();
  if (!ok) return;
  selectEvento(eventos.selectedId || eventos.activeId);
  renderEventosLista();
}

// Estado visible de un evento.
function estadoEvento(e) {
  if (e.finalizado) return { txt: 'Finalizado', cls: 'est-fin' };
  if (e.id === eventos.activeId) return { txt: '★ Activo', cls: 'est-act' };
  return { txt: 'Vigente', cls: 'est-vig' };
}

// Tabla CRUD de eventos con acciones por fila.
function renderEventosLista() {
  const tb = $('#eventos-tbody');
  if (!tb) return;
  tb.innerHTML = eventos.list.map((e) => {
    const st = estadoEvento(e);
    const fecha = e.fecha ? escapeHtml(e.fecha + (e.hora ? ' ' + e.hora : '')) : '—';
    const activar = e.id === eventos.activeId ? '' : `<button class="btn-mini" data-act="activar" data-id="${e.id}" title="Marcar activo">★</button>`;
    const finReab = e.finalizado
      ? `<button class="btn-mini" data-act="reabrir" data-id="${e.id}" title="Reabrir evento">↩︎</button>`
      : `<button class="btn-mini" data-act="finalizar" data-id="${e.id}" title="Finalizar evento">🏁</button>`;
    return `<tr class="${e.id === eventos.selectedId ? 'sel' : ''}">
      <td><strong>${escapeHtml(e.name || '—')}</strong>${e.tipo ? `<div class="contact">${escapeHtml(e.tipo)}</div>` : ''}</td>
      <td>${escapeHtml(e.edition || '—')}</td>
      <td class="contact">${fecha}</td>
      <td><span class="est ${st.cls}">${st.txt}</span></td>
      <td style="white-space:nowrap">
        <button class="btn-mini" data-act="editar" data-id="${e.id}" title="Editar">✏️</button>
        ${activar}${finReab}
        <a class="btn-mini" href="/qr?e=${encodeURIComponent(e.id)}" target="_blank" rel="noopener" title="Ver QR">🔳</a>
        <button class="del-lead" data-act="eliminar" data-id="${e.id}" title="Eliminar">🗑</button>
      </td></tr>`;
  }).join('') || '<tr><td colspan="5" class="empty">Sin eventos. Crea el primero con «Nuevo».</td></tr>';
}

// Acciones de cada fila de la lista de eventos.
$('#eventos-tbody')?.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id; const act = btn.dataset.act;
  if (act === 'editar') { selectEvento(id); renderEventosLista(); $('#evento-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  try {
    if (act === 'activar') { await api('/events/' + id + '/activate', { method: 'POST', staff: true }); toast('Evento marcado como activo', 'ok'); }
    else if (act === 'finalizar') { if (!confirm('¿Finalizar este evento? Pasará al histórico y ya no aparecerá para sortear.')) return; await api('/events/' + id + '/finalizar', { method: 'POST', staff: true }); toast('Evento finalizado', 'ok'); }
    else if (act === 'reabrir') { await api('/events/' + id + '/reabrir', { method: 'POST', staff: true }); toast('Evento reabierto', 'ok'); }
    else if (act === 'eliminar') { if (!confirm('¿Eliminar este evento? (no debe tener leads registrados)')) return; await api('/events/' + id, { method: 'DELETE', staff: true }); if (eventos.selectedId === id) eventos.selectedId = ''; toast('Evento eliminado', 'ok'); }
    await loadEventos();
    selectEvento(eventos.selectedId || eventos.activeId);
    renderEventosLista();
  } catch (err) { toast(err.message, 'err'); }
});

function selectEvento(id) {
  const e = eventos.list.find((x) => x.id === id) || eventos.list[0];
  if (!e) return;
  eventos.selectedId = e.id;
  $('#evento-select').value = e.id;
  const f = $('#evento-form');
  ['name', 'edition', 'tipo', 'lugar', 'fecha', 'hora', 'premio', 'plazoContactoDias', 'dinamica'].forEach((k) => {
    if (f[k]) f[k].value = e[k] || '';
  });
  f.permiteGanadoresPrevios.checked = e.permiteGanadoresPrevios !== false;
  eventos.premioImagen = undefined;
  renderPremioPreview(e.premioImagen ? ('/api/events/' + e.id + '/premio-imagen?ts=' + Date.now()) : null);
  // Enlaces por evento.
  $('#btn-evento-qr').href = '/qr?e=' + encodeURIComponent(e.id);
  $('#btn-evento-terminos').href = '/terminos?e=' + encodeURIComponent(e.id);
  $('#btn-evento-landing').href = '/registro?e=' + encodeURIComponent(e.id);
  const esActivo = e.id === eventos.activeId;
  $('#evento-activo-nota').innerHTML = esActivo
    ? '<span class="tag">★ Evento activo</span> — es el que usan por defecto la captura, el sorteo y el QR.'
    : 'Este evento no es el activo. Usa «Marcar activo» para que sea el predeterminado.';
  $('#evento-msg').textContent = '';
  renderEventosLista();
}

$('#evento-select').addEventListener('change', (e) => selectEvento(e.target.value));

$('#btn-evento-nuevo').addEventListener('click', async () => {
  try {
    const nuevo = await api('/events', { method: 'POST', body: { name: 'Evento nuevo' }, staff: true });
    await loadEventos();
    selectEvento(nuevo.id);
    toast('Evento creado. Configúralo y guarda.', 'ok');
  } catch (err) { toast(err.message, 'err'); }
});

$('#btn-evento-activar').addEventListener('click', async () => {
  try {
    await api('/events/' + eventos.selectedId + '/activate', { method: 'POST', staff: true });
    await loadEventos();
    selectEvento(eventos.selectedId);
    toast('Evento marcado como activo', 'ok');
  } catch (err) { toast(err.message, 'err'); }
});

$('#btn-evento-eliminar').addEventListener('click', async () => {
  if (!confirm('¿Eliminar este evento? (no debe tener leads registrados)')) return;
  try {
    await api('/events/' + eventos.selectedId, { method: 'DELETE', staff: true });
    eventos.selectedId = '';
    await loadEventos();
    selectEvento(eventos.activeId);
    toast('Evento eliminado', 'ok');
  } catch (err) { toast(err.message, 'err'); }
});

function renderPremioPreview(src) {
  const box = $('#premio-preview');
  const clear = $('#premio-clear');
  if (src) {
    box.innerHTML = `<img src="${src}" alt="Premio" />`;
    clear.hidden = false;
  } else {
    box.innerHTML = '<span class="ph">Sin imagen</span>';
    clear.hidden = true;
  }
}

$('#premio-file').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    // Reescala a máx. 1000px y convierte a JPEG para no enviar archivos enormes.
    const scale = Math.min(1, 1000 / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    eventos.premioImagen = c.toDataURL('image/jpeg', 0.85);
    renderPremioPreview(eventos.premioImagen);
  };
  img.src = URL.createObjectURL(file);
});

$('#premio-clear').addEventListener('click', () => {
  eventos.premioImagen = false;
  renderPremioPreview(null);
});

$('#evento-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (!eventos.selectedId) return;
  const body = {
    name: f.name.value.trim(),
    edition: f.edition.value.trim(),
    tipo: f.tipo.value.trim(),
    lugar: f.lugar.value.trim(),
    fecha: f.fecha.value,
    hora: f.hora.value,
    premio: f.premio.value.trim(),
    plazoContactoDias: f.plazoContactoDias.value,
    dinamica: f.dinamica.value.trim(),
    permiteGanadoresPrevios: f.permiteGanadoresPrevios.checked,
  };
  if (eventos.premioImagen !== undefined) body.premioImagen = eventos.premioImagen; // string o false
  const btn = $('#btn-evento-guardar');
  const msg = $('#evento-msg');
  btn.disabled = true;
  try {
    await api('/events/' + eventos.selectedId, { method: 'PUT', body, staff: true });
    msg.textContent = '✓ Evento guardado. La landing y los Términos y Condiciones reflejan estos datos.';
    msg.className = 'form-msg ok';
    eventos.premioImagen = undefined;
    await loadEventos(); // refresca nombres/activo en los selectores y la barra
    renderEventosLista(); // refresca la fila en la lista CRUD
  } catch (err) {
    msg.textContent = err.message || 'No se pudo guardar';
    msg.className = 'form-msg err';
  } finally { btn.disabled = false; }
});

// ---------- Usuarios (solo admin) ----------
async function loadUsuarios() {
  try {
    const { items } = await api('/users');
    $('#users-tbody').innerHTML = items.map((u) => `
      <tr>
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td class="contact">${escapeHtml(u.email)}</td>
        <td>${u.role === 'admin' ? '<span class="tag">Administrador</span>' : 'Staff'}</td>
        <td>${u.activo ? '<span class="mail ok">activo</span>' : '<span class="mail err">inactivo</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn-mini" data-act="pass" data-id="${u.id}" title="Cambiar contraseña">🔑</button>
          <button class="btn-mini" data-act="toggle" data-id="${u.id}" title="${u.activo ? 'Desactivar' : 'Activar'}">${u.activo ? '⏸' : '▶'}</button>
          <button class="del-lead" data-act="del" data-id="${u.id}" title="Eliminar">🗑</button>
        </td>
      </tr>`).join('') || '<tr><td colspan="5" class="empty">Sin usuarios.</td></tr>';
  } catch (err) { if (err.status !== 401) toast(err.message, 'err'); }
}

$('#user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const msg = $('#user-msg');
  try {
    await api('/users', { method: 'POST', body: { name: f.name.value.trim(), email: f.email.value.trim(), password: f.password.value, role: f.role.value } });
    msg.textContent = '✓ Usuario creado'; msg.className = 'form-msg ok';
    f.reset();
    loadUsuarios();
  } catch (err) { msg.textContent = err.message; msg.className = 'form-msg err'; }
});

$('#users-tbody').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.dataset.id;
  try {
    if (btn.dataset.act === 'del') {
      if (!confirm('¿Eliminar este usuario?')) return;
      await api('/users/' + id, { method: 'DELETE' });
    } else if (btn.dataset.act === 'toggle') {
      const activar = btn.textContent === '▶';
      await api('/users/' + id, { method: 'PUT', body: { activo: activar } });
    } else if (btn.dataset.act === 'pass') {
      const pass = prompt('Nueva contraseña (mínimo 6 caracteres):');
      if (!pass) return;
      await api('/users/' + id, { method: 'PUT', body: { password: pass } });
      toast('Contraseña actualizada', 'ok');
    }
    loadUsuarios();
  } catch (err) { toast(err.message, 'err'); }
});

// ---------- Arranque ----------
async function startApp() {
  await loadMeta();
  refreshRecent();
}
(async function boot() {
  if (state.token) {
    try {
      const { user } = await api('/auth/me');
      state.user = user;
      showApp();
      await startApp();
      goto(user && user.setup ? 'usuarios' : 'captura');
      return;
    } catch { logout(); }
  }
  showLogin();
  checkSetupAvailability();
})();
