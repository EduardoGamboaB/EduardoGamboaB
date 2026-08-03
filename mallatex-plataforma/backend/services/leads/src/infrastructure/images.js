/**
 * Utilidades para decodificar imágenes que llegan como dataURL en los payloads
 * JSON (fotos de gafete, imagen del premio) y convertirlas a Buffer para
 * almacenarlas como BYTEA en la tabla `leads.blobs`.
 */

const TOPE_BYTES = 6 * 1024 * 1024; // 6 MB

/**
 * Decodifica un dataURL `data:image/(png|jpeg|webp);base64,...` a
 * `{ buffer, mime }`, o null si no es válido o excede el tope.
 */
export function decodeImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > TOPE_BYTES) return null;
  const ext = m[1] === 'jpg' ? 'jpeg' : m[1];
  return { buffer, mime: `image/${ext}` };
}
