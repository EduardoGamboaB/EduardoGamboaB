/**
 * Limitador de intentos FALLIDOS de autenticación (por proceso, en memoria).
 *
 * Cuenta sólo los fallos por clave (ip + identificador): los logins correctos
 * no penalizan. Al superar `max` fallos dentro de `windowMs`, las peticiones
 * siguientes responden 429 hasta que la ventana expira. Un login exitoso
 * limpia el contador de esa clave.
 */
export function createLoginRateLimiter({ max = 10, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map(); // clave -> [timestamps de fallo]

  function keyOf(req) {
    const id = (req.body?.email || req.body?.code || '').toString().toLowerCase();
    const ip = req.ip || req.socket?.remoteAddress || '?';
    return `${ip}|${id}`;
  }

  function prune(list, now) {
    while (list.length && now - list[0] > windowMs) list.shift();
    return list;
  }

  return {
    /** Middleware: bloquea con 429 si la clave está saturada de fallos. */
    guard(req, res, next) {
      const now = Date.now();
      const list = prune(attempts.get(keyOf(req)) || [], now);
      if (list.length >= max) {
        const retryS = Math.ceil((windowMs - (now - list[0])) / 1000);
        res.set('Retry-After', String(retryS));
        return res.status(429).json({
          error: 'Demasiados intentos fallidos; espera unos minutos e inténtalo de nuevo.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: retryS,
        });
      }
      next();
    },
    /** Registra un intento fallido para la clave de esta petición. */
    fail(req) {
      const k = keyOf(req);
      const list = prune(attempts.get(k) || [], Date.now());
      list.push(Date.now());
      attempts.set(k, list);
    },
    /** Login correcto: limpia el contador de la clave. */
    succeed(req) {
      attempts.delete(keyOf(req));
    },
  };
}

/**
 * Limitador genérico por IP para endpoints públicos (autoregistro, ligas
 * públicas). Cuenta TODAS las peticiones por IP en la ventana y responde 429
 * al superar `max`. En memoria por proceso; suficiente como primer freno de
 * abuso/DoS. Detrás del gateway se debe activar TRUST_PROXY para ver la IP real.
 */
export function createIpRateLimiter({ max = 30, windowMs = 60 * 1000 } = {}) {
  const hits = new Map(); // ip -> [timestamps]
  const ipOf = (req) => req.ip || req.socket?.remoteAddress || '?';
  function prune(list, now) {
    while (list.length && now - list[0] > windowMs) list.shift();
    return list;
  }
  return function guard(req, res, next) {
    const now = Date.now();
    const list = prune(hits.get(ipOf(req)) || [], now);
    if (list.length >= max) {
      const retryS = Math.ceil((windowMs - (now - list[0])) / 1000);
      res.set('Retry-After', String(retryS));
      return res.status(429).json({
        error: 'Demasiadas solicitudes; inténtalo de nuevo en un momento.',
        code: 'RATE_LIMITED',
        retryAfterSeconds: retryS,
      });
    }
    list.push(now);
    hits.set(ipOf(req), list);
    next();
  };
}
