'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { brand, fontDisplay } from '@/lib/brand'
import { useApp } from '@/lib/context'
import { AssistantDrawer } from './AssistantDrawer'

// Botón flotante de la IA Pro. Aparece en esquina inferior derecha de
// cada perfil web. Mantiene badge "PRO" en rojo Mallatex (mismo lenguaje
// visual que el badge "MES" del logo). Demo: no llama a LLM real.
//
// Auto-abre por query string ?ia=chat|alerts|insights|forecasts
// (útil para capturar pantallas y para links profundos).
const VALID_TABS = ['chat', 'alerts', 'insights', 'forecasts']

// `openTab` viene como prop desde el WebShell (que lo recibe de la page server
// vía searchParams nativos de Next.js — permite deep links + screenshots).
export function AssistantBubble({ openTab = null }) {
  const { aiAlerts } = useApp()
  const initialOpen = VALID_TABS.includes(openTab)
  const [open, setOpen] = useState(initialOpen)
  const initialTab = initialOpen ? openTab : 'chat'

  const unread = aiAlerts.filter((a) => !a.dismissed && a.priority === 'high').length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir asistente IA Pro"
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 64, height: 64, borderRadius: '50%',
          background: brand.red, color: 'white', border: 'none',
          cursor: 'pointer', boxShadow: '0 10px 30px -8px rgba(227,6,19,0.5)',
          display: 'grid', placeItems: 'center',
          zIndex: 50, transition: 'transform .2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <Sparkles size={26} strokeWidth={2.5} />
        {/* Badge "PRO" pequeño */}
        <span style={{
          position: 'absolute', bottom: -4, right: -4,
          background: brand.black, color: 'white',
          ...fontDisplay, fontWeight: 900, fontSize: 9, letterSpacing: '0.1em',
          padding: '3px 6px', borderRadius: 4,
          border: `2px solid ${brand.red}`,
        }}>PRO</span>
        {/* Burbuja de alertas no leídas */}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: brand.warn, color: brand.black,
            ...fontDisplay, fontWeight: 900, fontSize: 11,
            width: 22, height: 22, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            border: `2px solid ${brand.white}`,
            animation: 'pulse 1.6s infinite',
          }}>{unread}</span>
        )}
      </button>

      {open && <AssistantDrawer initialTab={initialTab} onClose={() => setOpen(false)} />}
    </>
  )
}
