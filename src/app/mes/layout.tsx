import type { Metadata } from 'next'
import { AppProvider } from '@/mes/lib/store'

export const metadata: Metadata = {
  title: 'Mallatex MES',
  description:
    'Sistema MES de Mallatex — alineado a MT-PC-001 (Ingreso), MT-PC-002 (Egreso) y MT-PC-003 (Producción).',
}

export default function MesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Tipografías corporativas Mallatex */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
      />
      {/* Animaciones globales del MES (pulse, scan, hint-pulse) */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes scan  { from{top:10%} to{top:90%} }
        @keyframes hint-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(227,6,19,0)} 50%{box-shadow:0 0 0 4px rgba(227,6,19,0.3)} }
      `}</style>
      <AppProvider>{children}</AppProvider>
    </>
  )
}
