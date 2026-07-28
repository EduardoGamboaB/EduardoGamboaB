// Landing de autoregistro — lógica del formulario público.
const $ = (s) => document.querySelector(s);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s) => (String(s).match(/\d/g) || []).length;

// Cargar catálogos (producto de interés y nombre del evento).
(async function initMeta() {
  try {
    const meta = await (await fetch('/api/leads/meta')).json();
    if (meta.event?.name) $('#evento').textContent = meta.event.name;
    const sel = $('#sel-interes');
    (meta.intereses || []).forEach((i) => {
      const o = document.createElement('option');
      o.textContent = i; sel.appendChild(o);
    });
  } catch { /* la landing funciona sin catálogos */ }
})();

// Mostrar el premio del evento (si está configurado).
(async function initPremio() {
  try {
    const e = await (await fetch('/api/event/public')).json();
    if (e.name) $('#evento').textContent = [e.name, e.edition].filter(Boolean).join(' · ');
    const hayTexto = !!e.premio, hayImg = !!e.premioImagen;
    if (!hayTexto && !hayImg) return;
    if (hayImg) { const img = $('#prize-img'); img.src = '/api/event/premio-imagen'; img.hidden = false; }
    $('#prize-text').textContent = e.premio || 'Participa por el premio del stand.';
    if (e.fecha) {
      const [y, m, d] = e.fecha.split('-').map(Number);
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      let cuando = 'Sorteo el ' + d + ' de ' + meses[m - 1];
      if (e.hora) cuando += ' a las ' + e.hora + ' h';
      $('#prize-when').textContent = cuando;
    }
    $('#prize-card').hidden = false;
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
    nombre: form.nombre.value.trim(),
    empresa: form.empresa.value.trim(),
    telefono: form.telefono.value.trim(),
    email: form.email.value.trim(),
    interes: form.interes.value,
    website: form.website.value, // honeypot
    aceptaTerminos: form.aceptaTerminos.checked,
    aceptaPrivacidad: form.aceptaPrivacidad.checked,
  };

  // Validación en cliente (el servidor vuelve a validar).
  markInvalid('nombre', !body.nombre);
  markInvalid('email', !EMAIL_RE.test(body.email));
  markInvalid('telefono', digits(body.telefono) < 10);
  if (!body.nombre) return fail('Escribe tu nombre completo');
  if (!EMAIL_RE.test(body.email)) return fail('Ingresa un correo válido');
  if (digits(body.telefono) < 10) return fail('Ingresa un celular válido a 10 dígitos');
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
    $('#form-view').hidden = true;
    $('#ok-view').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    fail(err.message || 'No se pudo completar el registro');
    btn.disabled = false;
    btn.textContent = 'Registrarme y participar';
  }

  function fail(text) { msg.textContent = text; msg.className = 'form-msg err'; }
});
