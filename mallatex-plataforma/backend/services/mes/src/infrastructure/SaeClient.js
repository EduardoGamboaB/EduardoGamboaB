/**
 * SaeClient — adaptador de sincronización con Aspel SAE a través de un
 * MIDDLEWARE propio (HTTP). Sólo EMPUJA ajustes de inventario (los productos ya
 * existen en ambos por SKU): tras un conteo físico, envía las diferencias para
 * que el SAE ajuste sus existencias.
 *
 * Modos (env SAE_MODE):
 *   - 'mock' (por defecto): no llama a nada; responde ok con una ref simulada.
 *     Permite operar y probar sin el middleware conectado.
 *   - 'http': POST a SAE_MIDDLEWARE_URL con Bearer SAE_TOKEN.
 *
 * Contrato del POST (ajústalo al de tu middleware si difiere):
 *   body -> { folio, ubicacion, fecha, ajustes: [{ sku, cantidad, unidad }] }
 *           donde `cantidad` es la DIFERENCIA con signo (contado - teórico).
 *   resp -> 2xx con { ref } (folio/documento que el SAE/middleware asigna).
 */
export class SaeClient {
  constructor(env = process.env) {
    this.mode = (env.SAE_MODE || 'mock').toLowerCase();
    this.url = env.SAE_MIDDLEWARE_URL || '';
    this.token = env.SAE_TOKEN || '';
    this.timeoutMs = Number(env.SAE_TIMEOUT_MS || 15000);
  }

  /** ¿Está configurado para hablar con el middleware real? */
  configured() {
    return this.mode === 'http' && Boolean(this.url);
  }

  /**
   * Empuja los ajustes de un conteo. Devuelve { ok, ref?, error?, mocked? }.
   * Nunca lanza: el caso de uso decide cómo marcar el conteo con el resultado.
   */
  async pushAdjustments({ folio, ubicacion, fecha, ajustes } = {}) {
    const payload = { folio, ubicacion, fecha, ajustes: ajustes || [] };

    if (this.mode !== 'http') {
      // Mock: se acepta el ajuste y se devuelve una referencia estable por folio.
      return { ok: true, ref: `SAE-MOCK-${folio || 's/f'}`, mocked: true };
    }
    if (!this.url) {
      return { ok: false, error: 'SAE_MIDDLEWARE_URL no configurada (SAE_MODE=http).' };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* respuesta no-JSON */ }
      if (!res.ok) {
        return { ok: false, error: `SAE respondió ${res.status}: ${(json && (json.error || json.message)) || text || ''}`.trim() };
      }
      return { ok: true, ref: (json && (json.ref || json.folio || json.documento)) || null };
    } catch (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'Tiempo de espera agotado con el SAE.' : (e.message || 'Fallo de red con el SAE.') };
    } finally {
      clearTimeout(t);
    }
  }
}
