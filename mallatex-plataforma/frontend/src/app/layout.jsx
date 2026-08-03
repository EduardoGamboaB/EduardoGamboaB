import './globals.css'
import { AuthProvider } from '@/lib/auth'

export const metadata = {
  title: 'Mallatex · Plataforma',
  description:
    'Plataforma unificada Mallatex — Asistencia/NOI, CRM, MES y Leads. Protegemos lo que siembras.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ED3237',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Tipografías corporativas unificadas: familia Barlow + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Barlow:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
