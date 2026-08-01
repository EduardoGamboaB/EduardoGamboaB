'use client'

import { useState } from 'react'
import { brand, fontDisplay, fontMono } from '@/lib/brand'
import { BigButton } from '@/components/ui/BigButton'
import { Counter } from '@/components/ui/Counter'

const CATEGORIAS = [
  { id: 'sobrante',    emo: '♻️',  label: 'Sobrante',    color: brand.ok },
  { id: 'defecto',     emo: '🏭', label: 'Defecto',     color: brand.warn },
  { id: 'desperdicio', emo: '🗑️',  label: 'Desperdicio', color: brand.bad },
]

const DEFECTOS = [
  { id: 'corte-mal',         emo: '✂️',  label: 'Corte mal' },
  { id: 'quemado',           emo: '🔥', label: 'Quemado' },
  { id: 'perforado',         emo: '🕳️',  label: 'Perforado' },
  { id: 'rollo-defectuoso',  emo: '🏭', label: 'Rollo defectuoso' },
  { id: 'falla-equipo',      emo: '⚙️',  label: 'Falla equipo' },
  { id: 'otro',              emo: '❓', label: 'Otro' },
]

export function MermaTabletScreen({ order, onSubmit }) {
  const [metros, setMetros] = useState(0)
  const [categoria, setCategoria] = useState(null)
  const [defecto, setDefecto] = useState(null)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div>
        <div style={{ marginBottom: 14, background: brand.red, color: 'white', padding: 18, borderRadius: 12 }}>
          <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginBottom: 6, fontWeight: 700 }}>Orden actual</div>
          <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>{order?.material || 'Sin orden'}</div>
          <div style={{ ...fontMono, fontSize: 12, marginTop: 4 }}>{order?.medida} · {order?.id}</div>
        </div>

        <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>◆ Categoría</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          {CATEGORIAS.map((c) => (
            <button key={c.id} onClick={() => setCategoria(c.id)} style={{
              border: `2px solid ${categoria === c.id ? c.color : brand.line}`,
              padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              background: categoria === c.id ? c.color : brand.white,
              color: categoria === c.id ? 'white' : brand.ink,
              cursor: 'pointer', minHeight: 110,
            }}>
              <div style={{ fontSize: 38 }}>{c.emo}</div>
              <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 13, lineHeight: 1.1, textTransform: 'uppercase' }}>{c.label}</div>
            </button>
          ))}
        </div>

        <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>◆ Metros</div>
        <Counter value={metros} onChange={setMetros} label="Metros" step={0.5} />
      </div>

      <div>
        {categoria && categoria !== 'sobrante' && (
          <>
            <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>◆ ¿Por qué?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {DEFECTOS.map((d) => (
                <button key={d.id} onClick={() => setDefecto(d.id)} style={{
                  border: `2px solid ${defecto === d.id ? brand.red : brand.line}`,
                  padding: 12, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
                  background: defecto === d.id ? brand.red : brand.white,
                  color: defecto === d.id ? 'white' : brand.ink,
                  cursor: 'pointer', minHeight: 60, textAlign: 'left',
                }}>
                  <div style={{ fontSize: 28, flexShrink: 0 }}>{d.emo}</div>
                  <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 13, lineHeight: 1.1, textTransform: 'uppercase' }}>{d.label}</div>
                </button>
              ))}
            </div>
          </>
        )}

        <BigButton variant="ghost" emoji="📷" onClick={() => alert('Aquí se abriría la cámara')}>Tomar foto (evidencia)</BigButton>
        <BigButton variant="red" emoji="💾" disabled={!metros || !categoria || (categoria !== 'sobrante' && !defecto)} onClick={() => categoria && onSubmit(metros, categoria, defecto)}>
          Guardar registro
        </BigButton>
      </div>
    </div>
  )
}
