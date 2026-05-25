'use client'

import { useState } from 'react'
import { brand, fontDisplay, fontMono } from '@/mes/lib/brand'
import { BigButton } from '@/mes/components/ui/BigButton'

const TIPOS = [
  { id: 'falla',         emo: '🔧', label: 'Falla\nmáquina', desc: 'Falla mecánica' },
  { id: 'sin-material',  emo: '📦', label: 'Sin\nmaterial',  desc: 'Sin material' },
  { id: 'sin-hilo',      emo: '🧵', label: 'Sin\nhilo',      desc: 'Sin hilo' },
  { id: 'sin-luz',       emo: '💡', label: 'Sin\nluz',       desc: 'Sin energía' },
  { id: 'montacargas',   emo: '🚛', label: 'Monta-\ncargas', desc: 'Necesito montacargas' },
  { id: 'comida',        emo: '🍽️', label: 'Comida',         desc: 'Comida' },
  { id: 'bano',          emo: '🚻', label: 'Baño',           desc: 'Baño' },
  { id: 'otro',          emo: '❓', label: 'Otra\ncosa',     desc: 'Otro' },
]

export function AlertScreen({ onSubmit }: { onSubmit: (tipo: string, desc: string) => void }) {
  const [selected, setSelected] = useState<(typeof TIPOS)[number] | null>(null)
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper }}>
      <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700, textAlign: 'center' }}>
        ◆ Toca lo que te pasó
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 800, margin: '0 auto' }}>
        {TIPOS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelected(t)}
            style={{
              border: `2px solid ${selected?.id === t.id ? brand.red : brand.line}`,
              padding: 22,
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              background: selected?.id === t.id ? brand.red : brand.white,
              color: selected?.id === t.id ? 'white' : brand.ink,
              cursor: 'pointer',
              minHeight: 140,
              transition: 'all .15s',
            }}
          >
            <div style={{ fontSize: 52, lineHeight: 1 }}>{t.emo}</div>
            <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 14, lineHeight: 1.1, textTransform: 'uppercase', whiteSpace: 'pre-line', textAlign: 'center' }}>
              {t.label}
            </div>
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 600, margin: '24px auto 0' }}>
        <BigButton
          variant="red"
          emoji="📨"
          disabled={!selected}
          onClick={() => selected && onSubmit(selected.id, selected.desc)}
        >
          Enviar aviso
        </BigButton>
      </div>
    </div>
  )
}
