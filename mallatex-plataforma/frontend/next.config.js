/** @type {import('next').NextConfig} */

// Origen del API (para permitirlo explícitamente en la CSP de connect-src).
const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'

// CSP endurecida. 'unsafe-inline' en style/script es un compromiso de Next 14
// (estilos y runtime inline); connect-src se acota al API y a sí mismo.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  `connect-src 'self' ${API}`,
  "media-src 'self' blob:",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(self), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

module.exports = nextConfig
