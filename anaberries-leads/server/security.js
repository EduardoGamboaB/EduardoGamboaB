// Utilidades de seguridad: IP del cliente y limitador de tasa en memoria.

export function clientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'desconocida';
}

// Limitador simple por clave (IP) con ventana deslizante en memoria.
// Suficiente como backstop anti-spam para un evento (una sola instancia).
export function rateLimiter({ max, windowMs, keyFn = clientIp, message = 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }) {
  const hits = new Map(); // key -> [timestamps]
  return (req, res, next) => {
    const now = Date.now();
    const key = keyFn(req);
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }
    arr.push(now);
    hits.set(key, arr);
    // Limpieza oportunista para no crecer sin límite.
    if (hits.size > 5000) {
      for (const [k, v] of hits) { if (v.every((t) => now - t >= windowMs)) hits.delete(k); }
    }
    next();
  };
}
