/**
 * Utilidades para decodificar archivos que llegan como dataURL en los payloads
 * JSON (imágenes, videos y documentos del banco de activos) y convertirlos a
 * Buffer para almacenarlos como BYTEA (storage 'db') o subirlos a S3. Mismo
 * enfoque que leads/src/infrastructure/images.js, generalizado a cualquier MIME.
 */

// Tope duro global de decodificación (los topes por tipo los aplica el dominio).
const TOPE_BYTES = 200 * 1024 * 1024; // 200 MB

/**
 * Decodifica un dataURL `data:<mime>;base64,...` a `{ buffer, mime, sizeBytes }`,
 * o null si no es válido o excede el tope duro.
 */
export function decodeDataUrl(dataUrl, { maxBytes = TOPE_BYTES } = {}) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:([\w.+-]+\/[\w.+-]+)?(?:;[\w-]+=[\w.-]+)*;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) return null;
  return { buffer, mime: m[1] || 'application/octet-stream', sizeBytes: buffer.length };
}

/** Variante restringida a imágenes (paridad con leads). */
export function decodeImage(dataUrl) {
  const f = decodeDataUrl(dataUrl, { maxBytes: 6 * 1024 * 1024 });
  if (!f || !f.mime.startsWith('image/')) return null;
  return f;
}
