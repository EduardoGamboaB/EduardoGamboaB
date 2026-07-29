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
  };

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
    // suficiente para que el visitante anote su folio antes de la redirección.
    setTimeout(function () { window.location.href = 'https://mallatex.com.mx/'; }, 12000);
  } catch (err) {
    fail(err.message || 'No se pudo completar el registro');
    btn.disabled = false;
    btn.textContent = 'Registrarme y participar';
  }

  function fail(text) { msg.textContent = text; msg.className = 'form-msg err'; }
});
