/**
 * Envío de notificaciones push vía el servicio de Expo.
 *
 * No requiere credenciales: basta el ExponentPushToken que cada dispositivo
 * registra al iniciar sesión (POST /api/field/push-token). El envío es
 * best-effort y NUNCA debe tumbar el caso de uso que lo dispara: todos los
 * errores (red, tokens inválidos, timeout) se tragan y se reportan en el
 * valor de retorno.
 */
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100; // límite del API de Expo por request

function esTokenExpo(t) {
  return typeof t === 'string' && /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(t);
}

/**
 * @param {string[]} tokens  ExponentPushToken[...] de los destinatarios.
 * @param {{title:string, body?:string, data?:object}} message
 * @returns {Promise<{sent:number, skipped:number, failed:number}>}
 */
export async function sendExpoPush(tokens, { title, body = '', data = {} } = {}) {
  const validos = [...new Set((tokens || []).filter(esTokenExpo))];
  const skipped = (tokens || []).length - validos.length;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < validos.length; i += CHUNK) {
    const lote = validos.slice(i, i + CHUNK);
    const payload = lote.map((to) => ({ to, sound: 'default', title, body, data }));
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) sent += lote.length;
      else failed += lote.length;
    } catch {
      failed += lote.length; // sin red / timeout: silencioso por diseño
    }
  }
  return { sent, skipped, failed };
}
