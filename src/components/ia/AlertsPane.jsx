'use client'

import Link from 'next/link'
import { X, ArrowRight, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { useApp } from '@/lib/context'

const PRIORITY_META = {
  high:   { color: brand.red,  label: 'Alta',  icon: AlertTriangle },
  medium: { color: brand.warn, label: 'Media', icon: AlertCircle },
  low:    { color: '#888',     label: 'Baja',  icon: Info },
}

export function AlertsPane() {
  const { aiAlerts, dismissAiAlert } = useApp()
  const activas = aiAlerts.filter((a) => !a.dismissed)
  const sorted = [...activas].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9)
  })

  return (
    <div style={{ padding: 16 }}>
      <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
        ◆ {activas.length} alertas activas · ordenadas por prioridad
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', background: brand.white, borderRadius: 8, border: `1px solid ${brand.line}` }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Todo limpio</div>
          <div style={{ ...fontBody, fontSize: 12, color: '#666', marginTop: 6 }}>No hay alertas activas en este momento.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((a) => {
            const meta = PRIORITY_META[a.priority] ?? PRIORITY_META.low
            const Icon = meta.icon
            return (
              <div key={a.id} style={{
                background: brand.white,
                border: `1px solid ${brand.line}`,
                borderLeft: `4px solid ${meta.color}`,
                borderRadius: 6, padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon size={18} color={meta.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        ...fontDisplay, fontWeight: 800, fontSize: 9, letterSpacing: '0.1em',
                        padding: '2px 6px', borderRadius: 3, textTransform: 'uppercase',
                        background: meta.color, color: a.priority === 'medium' ? brand.black : 'white',
                      }}>{meta.label}</span>
                      <span style={{ ...fontMono, fontSize: 9, color: '#999', letterSpacing: '0.1em' }}>
                        {new Date(a.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 13, lineHeight: 1.3, textTransform: 'uppercase', color: brand.ink }}>
                      {a.title}
                    </div>
                    <div style={{ ...fontBody, fontSize: 12, color: '#555', marginTop: 4, lineHeight: 1.5 }}>
                      {a.detail}
                    </div>
                    {a.rationale && (
                      <div style={{ marginTop: 6, padding: 8, background: '#fafafa', borderRadius: 4, ...fontBody, fontSize: 11, color: '#666', lineHeight: 1.5 }}>
                        <b>Razonamiento:</b> {a.rationale}
                      </div>
                    )}
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      {a.actionTarget && (
                        <Link href={a.actionTarget} style={{
                          ...fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                          background: brand.red, color: 'white', textDecoration: 'none',
                          padding: '6px 10px', borderRadius: 4,
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                          {a.actionLabel ?? 'Atender'} <ArrowRight size={11} />
                        </Link>
                      )}
                      <button onClick={() => dismissAiAlert(a.id)} style={{
                        ...fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: 'transparent', color: '#888', border: `1px solid ${brand.line}`,
                        padding: '6px 10px', borderRadius: 4, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}><X size={11} /> Descartar</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
