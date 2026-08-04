/**
 * Utilidades para decodificar archivos que llegan como dataURL en los payloads
 * JSON (imágenes, videos y documentos del banco de activos) y convertirlos a
 * Buffer para almacenarlos como BYTEA (storage 'db') o subirlos a S3. Mismo
 * enfoque que leads/src/infrastructure/images.js, generalizado a cualquier MIME.
 */

// Tope duro global de decodificación (los topes por tipo los aplica el dominio).
const TOPE_BYTES = 30 * 1024 * 1024; // 30 MB

// MIME permitidos por tipo de activo. El banco NO acepta HTML/SVG ni MIME
// arbitrarios: se sirven inline y serían XSS almacenado (ver pentest #3).
const MIME_PERMITIDOS = {
  imagen: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  documento: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

/** Firmas (magic bytes) para verificar el MIME REAL, no el declarado. */
function sniffMime(buf) {
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.length >= 6 && (buf.slice(0, 6).toString('ascii') === 'GIF87a' || buf.slice(0, 6).toString('ascii') === 'GIF89a')) return 'image/gif';
  if (buf.length >= 5 && buf.slice(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  // ISO-BMFF (mp4/mov): 'ftyp' en el offset 4.
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('ascii');
    return brand.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }
  if (buf.length >= 4 && buf.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
  return null;
}

/**
 * Longitud decodificada estimada de un base64, SIN materializar el buffer.
 * Permite rechazar payloads enormes antes de asignar memoria (ver pentest #9).
 */
function base64DecodedLength(b64) {
  const len = b64.length;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - pad;
}

/**
 * Decodifica un dataURL `data:<mime>;base64,...` a `{ buffer, mime, sizeBytes }`,
 * o null si no es válido o excede el tope duro. El tamaño se valida ANTES de
 * decodificar para no asignar buffers enormes.
 */
export function decodeDataUrl(dataUrl, { maxBytes = TOPE_BYTES } = {}) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = /^data:([\w.+-]+\/[\w.+-]+)?(?:;[\w-]+=[\w.-]+)*;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const estimado = base64DecodedLength(m[2]);
  if (estimado <= 0 || estimado > maxBytes) return null; // rechazo previo a decodificar
  const buffer = Buffer.from(m[2], 'base64');
  if (!buffer.length || buffer.length > maxBytes) return null;
  return { buffer, mime: m[1] || 'application/octet-stream', sizeBytes: buffer.length };
}

/**
 * Decodifica y VALIDA que el contenido real corresponda a un MIME permitido
 * para `tipo`. Devuelve `{ buffer, mime, sizeBytes }` con el MIME REAL (de los
 * magic bytes, no el declarado) o null si no pasa la lista blanca.
 */
export function decodeAssetFile(dataUrl, tipo, { maxBytes = TOPE_BYTES } = {}) {
  const f = decodeDataUrl(dataUrl, { maxBytes });
  if (!f) return null;
  const permitidos = MIME_PERMITIDOS[tipo];
  if (!permitidos) return null;
  const real = sniffMime(f.buffer);
  if (!real || !permitidos.includes(real)) return null;
  return { ...f, mime: real }; // se persiste el MIME real, nunca el declarado
}

/** Variante restringida a imágenes (paridad con leads). */
export function decodeImage(dataUrl) {
  return decodeAssetFile(dataUrl, 'imagen', { maxBytes: 6 * 1024 * 1024 });
}
