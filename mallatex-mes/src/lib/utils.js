// Helpers puros del MES (sin React, sin DOM).
// Si en el futuro surgen helpers compartidos por varios componentes, viven aquí.

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

export function formatNumber(n) {
  return new Intl.NumberFormat('es-MX').format(n)
}
