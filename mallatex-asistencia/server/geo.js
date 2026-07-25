// Utilidades de geolocalización para la asistencia de campo.

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
  if (!site || typeof site.lat !== 'number' || typeof site.lng !== 'number') {
    return { distanceMeters: null, withinGeofence: null };
  }
  const distanceMeters = haversineMeters(site.lat, site.lng, lat, lng);
  const radius = Number(site.radiusMeters) || 0;
  return { distanceMeters, withinGeofence: radius > 0 ? distanceMeters <= radius : null };
}

// Distancia euclidiana entre descriptores faciales (128D). Menor = más parecido.
export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}
export const FACE_MATCH_THRESHOLD = 0.5;
