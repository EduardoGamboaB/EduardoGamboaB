// Servicio de correo para notificar al ganador su folio.
// Usa SMTP (nodemailer). Si no hay SMTP_HOST configurado, el envío se omite
// (la app sigue funcionando y el folio queda registrado para entregarlo a mano).

import { config } from './config.js';

let transporter = null;
let enabled = false;

export async function initMailer() {
  if (!config.smtp.host) { enabled = false; return { enabled: false }; }
  try {
    const nodemailer = (await import('nodemailer')).default;
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
    enabled = true;
    console.log('Correo: SMTP configurado (' + config.smtp.host + ')');
    return { enabled: true };
  } catch (e) {
    enabled = false;
    console.error('No se pudo inicializar el correo:', e.message);
    return { enabled: false };
  }
}

export function mailerEnabled() { return enabled; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Envía el correo del ganador. Devuelve { sent } o { skipped } o { error }.
export async function sendWinnerEmail({ to, nombre, premio, folio, evento, fecha, hora, lugar }) {
  if (!enabled) return { skipped: true };
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
    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `🏆 Ganaste en ${evento || 'Mallatex'} — Folio ${folio}`,
      html,
      text: `¡Felicidades ${nombre || ''}! Ganaste: ${premio || ''}. Tu folio es ${folio}. Preséntalo en el stand de Mallatex.`,
    });
    return { sent: true };
  } catch (e) {
    console.error('Error al enviar correo al ganador:', e.message);
    return { error: e.message };
  }
}
