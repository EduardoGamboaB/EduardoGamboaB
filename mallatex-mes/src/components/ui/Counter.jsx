'use client'

import { Minus, Plus } from 'lucide-react'
import { brand, fontDisplay, fontMono } from '@/lib/brand'

export function Counter({ value, onChange, label, step = 1, min = 0 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 14, background: brand.white, border: `2px solid ${brand.line}`, borderRadius: 12, overflow: 'hidden', minHeight: 90 }}>
      <button onClick={() => onChange(Math.max(min, value - step))}
        style={{ width: 80, background: brand.red, color: brand.white, border: 'none', cursor: 'pointer' }}>
        <Minus size={32} strokeWidth={3} style={{ margin: '0 auto', display: 'block' }} />
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 0' }}>
        <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 56, lineHeight: 1, color: brand.ink }}>{value}</div>
        <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', marginTop: 4, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      </div>
      <button onClick={() => onChange(value + step)}
        style={{ width: 80, background: brand.red, color: brand.white, border: 'none', cursor: 'pointer' }}>
        <Plus size={32} strokeWidth={3} style={{ margin: '0 auto', display: 'block' }} />
      </button>
    </div>
  )
}
