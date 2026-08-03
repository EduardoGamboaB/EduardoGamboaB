/**
 * Mailer — notificación del ganador por correo. Stub log-only.
 *
 * En el monolito original el envío usaba Mailchimp Transactional (Mandrill) por
 * API o SMTP. Aquí se conservan las variables de entorno (MANDRILL_API_KEY /
 * SMTP_HOST) para reportar si el correo "está configurado", pero el envío real
 * es opcional: este stub sólo registra en consola. Si no hay proveedor, el
 * envío se omite (`skipped`) y el folio se entrega en el stand. El envío del
 * correo al ganador es best-effort; el folio siempre queda registrado.
 */
export function createMailer(env = process.env) {
  const hasMandrill = !!env.MANDRILL_API_KEY;
  const hasSmtp = !!env.SMTP_HOST;
  const mode = hasMandrill ? 'mandrill' : hasSmtp ? 'smtp' : 'off';

  const enabled = () => mode !== 'off';
  const provider = () =>
    mode === 'mandrill' ? 'Mailchimp (Mandrill)' : mode === 'smtp' ? 'SMTP' : '';

  // Envío best-effort. Devuelve { sent } | { skipped } | { error }.
  async function sendWinnerEmail({ to, nombre, premio, folio, evento }) {
    if (mode === 'off') return { skipped: true };
    if (!to) return { skipped: true, reason: 'sin correo' };
    // eslint-disable-next-line no-console
    console.log(
      `[leads:mailer] (${provider()}) ganador → ${to} · ${nombre || ''} · premio "${premio || ''}" · folio ${folio} · evento "${evento || ''}"`
    );
    return { sent: true };
  }

  async function sendTestEmail(to) {
    if (mode === 'off') return { skipped: true };
    if (!to) return { skipped: true, reason: 'sin correo' };
    // eslint-disable-next-line no-console
    console.log(`[leads:mailer] (${provider()}) correo de prueba → ${to}`);
    return { sent: true };
  }

  return { enabled, provider, sendWinnerEmail, sendTestEmail };
}
