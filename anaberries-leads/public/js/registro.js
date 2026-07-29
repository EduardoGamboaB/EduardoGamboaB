// Landing de autoregistro — lógica del formulario público (por evento).
const $ = (s) => document.querySelector(s);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s) => (String(s).match(/\d/g) || []).length;

// Evento objetivo: viene del QR como ?e=<id>; si no, se usa el evento activo.
const params = new URLSearchParams(location.search);
const eventId = params.get('e') || '';
let eventoResuelto = null;

// Ajusta los enlaces legales para que muestren el evento correcto.
function ajustarEnlacesLegales(id) {
  if (!id) return;
  document.querySelectorAll('a[href="/terminos"]').forEach((a) => { a.href = '/terminos?e=' + encodeURIComponent(id); });
  document.querySelectorAll('a[href="/aviso-privacidad"]').forEach((a) => { a.href = '/aviso-privacidad'; });
}

// Cargar catálogos (producto de interés).
(async function initMeta() {
  try {
    const meta = await (await fetch('/api/leads/meta')).json();
    const sel = $('#sel-interes');
    (meta.intereses || []).forEach((i) => {
      const o = document.createElement('option');
      o.textContent = i; sel.appendChild(o);
    });
  } catch { /* la landing funciona sin catálogos */ }
})();

// Cargar el evento (nombre, premio, fecha) y mostrarlo.
(async function initEvento() {
  try {
    const url = eventId ? '/api/events/public/' + encodeURIComponent(eventId) : '/api/events/public/active';
    const e = await (await fetch(url)).json();
    if (!e || e.error) return;
    eventoResuelto = e.id;
    ajustarEnlacesLegales(e.id);
    if (e.name) $('#evento').textContent = [e.name, e.edition].filter(Boolean).join(' · ');

    const hayTexto = !!e.premio, hayImg = !!e.premioImagen;
    if (hayTexto || hayImg) {
      if (hayImg) { const img = $('#prize-img'); img.src = '/api/events/' + e.id + '/premio-imagen'; img.hidden = false; }
      $('#prize-text').textContent = e.premio || 'Participa por el premio del stand.';
      if (e.fecha) {
        const [y, m, d] = e.fecha.split('-').map(Number);
        const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        let cuando = 'Sorteo el ' + d + ' de ' + meses[m - 1];
        if (e.hora) cuando += ' a las ' + e.hora + ' h';
        $('#prize-when').textContent = cuando;
      }
      $('#prize-card').hidden = false;
    }
  } catch { /* opcional */ }
})();

function markInvalid(name, bad) {
  const el = document.querySelector(`[name=${name}]`);
  if (el) el.classList.toggle('invalid', bad);
}

$('#registro-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = $('#msg');
  const btn = $('#btn-enviar');
  msg.textContent = '';

  const body = {
    event: eventoResuelto || eventId || undefined,
    nombre: form.nombre.value.trim(),
    empresa: form.empresa.value.trim(),
    estado: form.estado.value,
    telefono: form.telefono.value.trim(),
    email: form.email.value.trim(),
    interes: form.interes.value,
    website: form.website.value, // honeypot
    aceptaTerminos: form.aceptaTerminos.checked,
    aceptaPrivacidad: form.aceptaPrivacidad.checked,
    metodoCaptura: gafete.photo ? 'gafete' : 'autoregistro',
  };
  if (gafete.photo) body.foto = gafete.photo;

  markInvalid('nombre', !body.nombre);
  markInvalid('email', !EMAIL_RE.test(body.email));
  markInvalid('telefono', digits(body.telefono) !== 10);
  if (!body.nombre) return fail('Escribe tu nombre completo');
  if (!EMAIL_RE.test(body.email)) return fail('Ingresa un correo empresarial válido');
  if (digits(body.telefono) !== 10) return fail('El celular debe tener exactamente 10 dígitos');
  if (!body.aceptaTerminos || !body.aceptaPrivacidad) return fail('Acepta los términos y el aviso de privacidad');

  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    const res = await fetch('/api/leads/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'No se pudo completar el registro');
    if (data.yaRegistrado) $('#ok-title').textContent = '¡Ya estabas registrado!';
    if (data.folio) $('#ok-folio').textContent = data.folio;
    $('#ok-folio-box').hidden = !data.folio;
    $('#form-view').hidden = true;
    $('#ok-view').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Tras el registro exitoso, redirige al sitio oficial de Mallatex. Se da tiempo
    // para que el visitante alcance a ver/anotar su folio.
    setTimeout(function () { window.location.href = 'https://mallatex.com.mx/'; }, 15000);
  } catch (err) {
    fail(err.message || 'No se pudo completar el registro');
    btn.disabled = false;
    btn.textContent = 'Registrarme y participar';
  }

  function fail(text) { msg.textContent = text; msg.className = 'form-msg err'; }
});

// ==================== Captura por foto del gafete (OCR con Tesseract) ====================
const $$ = (s) => Array.from(document.querySelectorAll(s));
const gafete = { mode: 'gafete', photo: null, stream: null, worker: null };

// Selector de modo: 📷 gafete (principal) / ✍️ manual (secundario).
$('#capture-modes')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.cap-mode');
  if (!btn) return;
  gafete.mode = btn.dataset.mode;
  $$('.cap-mode').forEach((b) => b.classList.toggle('is-active', b === btn));
  const panel = $('#gafete-panel');
  if (gafete.mode === 'gafete') { panel.hidden = false; }
  else { panel.hidden = true; stopCamera(); }
});

function simdSupported() {
  try { return WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])); }
  catch { return false; }
}

// Dibuja imagen/vídeo a canvas reescalado → dataURL JPEG.
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
  } catch (err) {
    setOcrProgress(0, 'No se pudo abrir la cámara. Usa «Subir imagen».');
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

$('#btn-cam-start')?.addEventListener('click', startCamera);
$('#btn-cam-retake')?.addEventListener('click', () => { resetGafete(); startCamera(); });
$('#btn-cam-shot')?.addEventListener('click', () => {
  const v = $('#cam-video');
  showPhoto(toDataUrl(v, v.videoWidth, v.videoHeight));
  stopCamera();
});
$('#cam-file')?.addEventListener('change', (e) => {
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

// Heurística para extraer datos del texto del gafete (misma que el staff).
function parseBadge(text) {
  const raw = text.replace(/\r/g, '').trim();
  const allLines = raw.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const emailRe = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
  const email = (raw.match(emailRe) || [''])[0].toLowerCase();
  let telefono = '';
  for (const l of allLines) {
    const dg = (l.match(/\d/g) || []).length;
    if (dg >= 10 && /[\d][\d\s().+-]{8,}[\d]/.test(l)) { telefono = l.replace(/[^\d]/g, '').slice(-10); break; }
  }
  const noiseRe = /\b(expo|anaberries|gafete|visitante|expositor|ponente|congreso|feria|foro|stand|booth|badge|welcome|bienvenid)\b|\b(19|20)\d{2}\b/i;
  const esContacto = (l) => emailRe.test(l) || (telefono && l.replace(/[^\d]/g, '').slice(-10) === telefono) || /@|www\.|http|\.com|\.mx|\.org/i.test(l);
  const candidatas = allLines.filter((l) => !noiseRe.test(l) && !esContacto(l));
  const empresaFuerte = /(S\.?\s?A\.?(\s+de\s+C\.?\s?V\.?)?|S\.\s?de\s?R\.?L\.?|de\s+C\.?\s?V\.?|\bS\.?P\.?R\.?\b)/i;
  const empresaClave = /(Agr[ií]cola|Rancho|Invernaderos?|Berries|Frut[ií]cola|Hortalizas|Cultivos|Campo|Agro\w*|Comercializadora|Grupo|Productora|Exporta\w*|Viveros?|Empaque\w*|Distribuidora|Semillas)/i;
  const pareceNombre = (l) => {
    const words = l.split(/\s+/).filter(Boolean);
    return words.length >= 2 && words.length <= 4 && /^[A-Za-zÁÉÍÓÚÑáéíóúñ.'\- ]+$/.test(l)
      && !empresaFuerte.test(l) && !empresaClave.test(l) && l.length >= 5 && l.length <= 40;
  };
  let nombre = candidatas.find(pareceNombre) || '';
  let empresa = '';
  let mejor = 0;
  const idxNombre = nombre ? candidatas.indexOf(nombre) : -1;
  candidatas.forEach((l, i) => {
    if (l === nombre || l.length > 70) return;
    let score = (empresaFuerte.test(l) ? 2 : 0) + (empresaClave.test(l) ? 1 : 0);
    if (score > 0 && idxNombre >= 0 && i === idxNombre + 1) score += 1;
    if (score > mejor) { mejor = score; empresa = l; }
  });
  if (!empresa && idxNombre >= 0 && candidatas[idxNombre + 1]) {
    const sig = candidatas[idxNombre + 1];
    if (sig.length >= 3 && sig.length <= 70) empresa = sig;
  }
  return { nombre, empresa, email, telefono };
}

function fillField(name, value) {
  if (!value) return false;
  const el = document.querySelector(`#registro-form [name=${name}]`);
  if (el && !el.value) { el.value = value; el.classList.add('ocr-filled'); setTimeout(() => el.classList.remove('ocr-filled'), 1200); return true; }
  return false;
}

$('#btn-ocr')?.addEventListener('click', async () => {
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
    setOcrProgress(1, filled ? `Se llenaron ${filled} campo(s). Revisa y completa tu celular y correo.` : 'No se detectaron datos claros. Captura manual.');
    $('#registro-form [name=nombre]')?.focus();
  } catch (err) {
    setOcrProgress(0, err.message || 'No se pudo leer el gafete. Captura manual.');
  } finally { btn.disabled = false; }
});

// ---------- Mayúsculas automáticas en los campos de texto de la landing ----------
(function enableUppercaseLanding() {
  const form = document.querySelector('#registro-form');
  if (!form) return;
  const exentos = new Set(['email', 'telefono', 'website']);
  form.querySelectorAll('input, textarea').forEach((el) => {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (['email', 'tel', 'number', 'password', 'checkbox', 'file', 'hidden'].includes(type)) return;
    if (exentos.has(el.name)) return;
    el.style.textTransform = 'uppercase';
    el.addEventListener('input', () => {
      const s = el.selectionStart, e = el.selectionEnd;
      el.value = el.value.toUpperCase();
      try { el.setSelectionRange(s, e); } catch { /* noop */ }
    });
  });
})();
