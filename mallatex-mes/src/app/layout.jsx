import { AppProvider } from '@/lib/context'
import './globals.css'

export const metadata = {
  title: 'Mallatex MES',
  description:
    'Sistema MES de Tejidos Técnicos Mallatex · MT-PC-001/002/003. Protegemos lo que siembras.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        {/* Tipografías corporativas (CLAUDE.md §3): Barlow Condensed, Barlow, JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  )
}
