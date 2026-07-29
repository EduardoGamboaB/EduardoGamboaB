// Servicio de correo para notificar al ganador su folio.
// Prioriza Mailchimp Transactional (Mandrill) por API; si no, usa SMTP.
// Si no hay ninguno configurado, el envío se omite (el folio se entrega a mano).

import { config } from './config.js';

let transporter = null;
let mode = 'off'; // 'mandrill' | 'smtp' | 'off'

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "Mallatex <no-reply@mallatex.com.mx>" → { name, email }
function parseFrom(s) {
  const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(s || '');
  if (m) return { name: (m[1] || 'Mallatex').trim(), email: m[2].trim() };
  return { name: 'Mallatex', email: (s || 'no-reply@mallatex.com.mx').trim() };
}

export async function initMailer() {
  if (config.mandrill.apiKey) {
    mode = 'mandrill';
    console.log('Correo: Mailchimp Transactional (Mandrill) configurado por API');
    return { enabled: true, mode };
  }
  if (config.smtp.host) {
    try {
      const nodemailer = (await import('nodemailer')).default;
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
      });
      mode = 'smtp';
      console.log('Correo: SMTP configurado (' + config.smtp.host + ')');
      return { enabled: true, mode };
    } catch (e) {
      mode = 'off';
      console.error('No se pudo inicializar el correo (SMTP):', e.message);
      return { enabled: false };
    }
  }
  mode = 'off';
  return { enabled: false };
}

export function mailerEnabled() { return mode !== 'off'; }
export function mailerProvider() {
  return mode === 'mandrill' ? 'Mailchimp (Mandrill)' : mode === 'smtp' ? 'SMTP' : '';
}

// Envío por la API de Mailchimp Transactional (Mandrill).
async function sendViaMandrill({ to, subject, html, text }) {
  const from = parseFrom(config.mailFrom);
  const payload = {
    key: config.mandrill.apiKey,
    message: {
      html, text, subject,
      from_email: from.email,
      from_name: from.name,
      to: [{ email: to, type: 'to' }],
    },
  };
  const r = await fetch(config.mandrill.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = data && (data.message || data.error) ? (data.message || data.error) : ('HTTP ' + r.status);
    throw new Error('Mandrill: ' + msg);
  }
  const res = Array.isArray(data) ? data[0] : data;
  const status = res && res.status;
  if (status === 'sent' || status === 'queued' || status === 'scheduled') return { sent: true, status };
  throw new Error('Mandrill rechazó el envío: ' + (res && (res.reject_reason || res.status) ? (res.reject_reason || res.status) : 'desconocido'));
}

// Envío genérico según el proveedor activo.
async function sendMail({ to, subject, html, text }) {
  if (mode === 'mandrill') return sendViaMandrill({ to, subject, html, text });
  if (mode === 'smtp') { await transporter.sendMail({ from: config.mailFrom, to, subject, html, text }); return { sent: true }; }
  return { skipped: true };
}

// Envía el correo del ganador. Devuelve { sent } o { skipped } o { error }.
export async function sendWinnerEmail({ to, nombre, premio, folio, evento, fecha, hora, lugar }) {
  if (mode === 'off') return { skipped: true };
  if (!to) return { skipped: true, reason: 'sin correo' };
  const cuando = [fecha, hora].filter(Boolean).join(' ');
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#232121">
    <div style="background:#ed3237;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:1px;opacity:.9">${esc(evento || 'Evento Mallatex')}</div>
      <h1 style="margin:6px 0 0;font-size:22px">🏆 ¡Felicidades, ${esc(nombre || '')}!</h1>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:22px 24px;border-radius:0 0 12px 12px">
      <p>Resultaste <strong>ganador(a)</strong> del sorteo de Mallatex.</p>
      <p style="margin:6px 0">Premio: <strong>${esc(premio || '')}</strong></p>
      <p style="margin:16px 0 6px">Presenta este folio en el stand para reclamar tu premio:</p>
      <div style="text-align:center;margin:10px 0 18px">
        <div style="display:inline-block;background:#fef3f3;border:2px dashed #ed3237;border-radius:10px;
          padding:14px 26px;font-size:26px;font-weight:800;letter-spacing:3px;color:#9b3234">${esc(folio)}</div>
      </div>
      ${cuando ? `<p style="margin:6px 0">Fecha del sorteo: <strong>${esc(cuando)}</strong></p>` : ''}
      ${lugar ? `<p style="margin:6px 0">Lugar: <strong>${esc(lugar)}</strong></p>` : ''}
      <p style="color:#606062;font-size:13px;margin-top:18px">Conserva este correo. Si tienes dudas, acércate al stand de Mallatex.</p>
    </div>
    <p style="text-align:center;color:#a7a8ac;font-size:12px;margin-top:14px">Mallatex · Protegemos lo que siembras</p>
  </div>`;
  try {
    const r = await sendMail({
      to,
      subject: `🏆 Ganaste en ${evento || 'Mallatex'} — Folio ${folio}`,
      html,
      text: `¡Felicidades ${nombre || ''}! Ganaste: ${premio || ''}. Tu folio es ${folio}. Preséntalo en el stand de Mallatex.`,
    });
    return { sent: !!r.sent, skipped: !!r.skipped };
  } catch (e) {
    console.error('Error al enviar correo al ganador:', e.message);
    return { error: e.message };
  }
}

// Correo de prueba para verificar la integración (Mandrill o SMTP).
export async function sendTestEmail(to) {
  if (mode === 'off') return { skipped: true };
  if (!to) return { skipped: true, reason: 'sin correo' };
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#232121">
    <div style="background:#ed3237;color:#fff;padding:18px 22px;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:20px">✅ Correo de prueba — Mallatex · Sorteos</h1>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:20px 22px;border-radius:0 0 12px 12px">
      <p>La integración de correo (${esc(mailerProvider())}) está funcionando correctamente.</p>
      <p style="color:#606062;font-size:13px">Con esto, el folio del ganador se enviará automáticamente por correo.</p>
    </div>
  </div>`;
  try {
    const r = await sendMail({ to, subject: 'Prueba de correo — Mallatex · Sorteos', html, text: 'Correo de prueba. La integración de correo funciona correctamente.' });
    return { sent: !!r.sent, skipped: !!r.skipped };
  } catch (e) {
    return { error: e.message };
  }
}
