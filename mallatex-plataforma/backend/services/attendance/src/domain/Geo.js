// Utilidades de geolocalización y verificación facial para la asistencia de campo
// y el modo kiosco. Servicio de dominio puro. Portado de server/geo.js.

// Distancia entre dos coordenadas (metros) por la fórmula de Haversine.
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // radio terrestre en metros
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
}

// Evalúa un punto contra la geocerca de un sitio.
export function evaluateGeofence(site, lat, lng) {
  const sLat = site == null ? null : Number(site.lat);
  const sLng = site == null ? null : Number(site.lng);
  if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) {
    return { distanceMeters: null, withinGeofence: null };
  }
  const distanceMeters = haversineMeters(sLat, sLng, lat, lng);
  const radius = Number(site.radiusMeters) || 0;
  return { distanceMeters, withinGeofence: radius > 0 ? distanceMeters <= radius : null };
}

// Distancia euclidiana entre descriptores faciales (128D). Menor = más parecido.
export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

// Umbral de coincidencia facial (típico 0.5–0.6; menor = coincide).
export const FACE_MATCH_THRESHOLD = 0.5;

/**
 * Identifica al empleado enrolado más parecido a un descriptor facial.
 * Devuelve { employee, distance } si la mejor coincidencia está bajo el umbral.
 */
export function matchByDescriptor(descriptor, employees, threshold = FACE_MATCH_THRESHOLD) {
  const enrolled = employees.filter(
    (e) => e.active !== false && Array.isArray(e.faceDescriptor) && e.faceDescriptor.length === 128
  );
  let best = null;
  let bestDist = Infinity;
  for (const e of enrolled) {
    const dist = euclidean(descriptor, e.faceDescriptor);
    if (dist < bestDist) { bestDist = dist; best = e; }
  }
  return best && bestDist <= threshold ? { employee: best, distance: bestDist } : null;
}
