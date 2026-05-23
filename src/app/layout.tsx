import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Mallatex Production Suite',
    template: '%s · Mallatex',
  },
  description:
    'Control de producción para agrotextiles: mallas agrícolas, cubre suelos, malla antiáfidos y agricultura protegida.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Mallatex',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mallatex',
  },
  icons: {
    icon: '/brand/icon.svg',
    apple: '/brand/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#2D7A3E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
