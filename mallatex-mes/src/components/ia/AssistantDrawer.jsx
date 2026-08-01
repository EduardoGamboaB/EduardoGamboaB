'use client'

import { useState } from 'react'
import { X, MessageSquare, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
import { brand, fontDisplay, fontMono } from '@/lib/brand'
import { ChatPane } from './ChatPane'
import { AlertsPane } from './AlertsPane'
import { InsightsPane } from './InsightsPane'
import { ForecastsPane } from './ForecastsPane'

const TABS = [
  { id: 'chat',      label: 'Chat',       icon: MessageSquare },
  { id: 'alerts',    label: 'Alertas',    icon: AlertTriangle },
  { id: 'insights',  label: 'Insights',   icon: FileText },
  { id: 'forecasts', label: 'Pronósticos', icon: TrendingUp },
]

export function AssistantDrawer({ initialTab = 'chat', onClose }) {
  const [tab, setTab] = useState(initialTab)

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 60, animation: 'fadein .2s ease-out',
      }} />

      {/* Drawer */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 440,
        background: brand.white, zIndex: 61,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 40px -10px rgba(0,0,0,0.3)',
        animation: 'slidein .25s ease-out',
      }}>
        {/* Header */}
        <header style={{
          background: brand.black, color: 'white',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: brand.red, display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <span style={{ ...fontDisplay, fontWeight: 900, fontSize: 11, letterSpacing: '0.1em' }}>PRO</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Asistente IA · Mallatex
            </div>
            <div style={{ ...fontMono, fontSize: 9, color: '#aaa', letterSpacing: '0.18em', marginTop: 2, textTransform: 'uppercase' }}>
              Demo · Fase 4 · sin LLM conectado
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            background: 'transparent', color: 'white', border: 'none',
            cursor: 'pointer', padding: 4, display: 'grid', placeItems: 'center',
          }}>
            <X size={22} />
          </button>
        </header>

        {/* Tabs */}
        <nav style={{
          display: 'flex', borderBottom: `1px solid ${brand.line}`,
          flexShrink: 0, background: brand.paper,
        }}>
          {TABS.map((t) => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '12px 8px',
                background: active ? brand.white : 'transparent',
                border: 'none',
                borderBottom: `3px solid ${active ? brand.red : 'transparent'}`,
                cursor: 'pointer',
                ...fontDisplay, fontWeight: 700, fontSize: 11,
                color: active ? brand.red : '#666',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <Icon size={16} />
                {t.label}
              </button>
            )
          })}
        </nav>

        {/* Contenido del tab */}
        <div style={{ flex: 1, overflowY: 'auto', background: brand.paper }}>
          {tab === 'chat'      && <ChatPane />}
          {tab === 'alerts'    && <AlertsPane />}
          {tab === 'insights'  && <InsightsPane />}
          {tab === 'forecasts' && <ForecastsPane />}
        </div>
      </aside>

      {/* Animaciones locales */}
      <style>{`
        @keyframes slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadein  { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  )
}
