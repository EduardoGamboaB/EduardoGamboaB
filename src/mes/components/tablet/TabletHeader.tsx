'use client'

import { ArrowLeft, Plus } from 'lucide-react'
import { brand, fontDisplay, fontMono } from '@/mes/lib/brand'
import { MallatexLogo } from '@/mes/components/brand/Logo'
import { LineaReal } from '@/mes/lib/constants'
import { Operator } from '@/mes/lib/seed'
import { formatTime, formatDate } from '@/mes/lib/format'

export function TabletHeader({
  linea,
  currentTime,
  currentOps,
  activeOpId,
  onSelectOp,
  onAddOp,
  showOps = true,
  back,
  title,
  subtitle,
}: {
  linea?: LineaReal
  currentTime: Date
  currentOps: Operator[]
  activeOpId: number | null
  onSelectOp: (id: number) => void
  onAddOp: () => void
  showOps?: boolean
  back?: () => void
  title?: string
  subtitle?: string
}) {
  return (
    <header
      style={{
        background: brand.white,
        borderBottom: `1px solid ${brand.line}`,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
        {back ? (
          <button
            onClick={back}
            style={{
              background: brand.redLight,
              color: brand.red,
              border: `1px solid ${brand.red}`,
              borderRadius: 8,
              padding: '10px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              ...fontDisplay,
              fontWeight: 700,
              fontSize: 13,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <ArrowLeft size={16} /> Atrás
          </button>
        ) : (
          <>
            <MallatexLogo size={32} />
            <div style={{ width: 1, height: 38, background: brand.line }} />
          </>
        )}
        <div style={{ minWidth: 0 }}>
          {title ? (
            <>
              <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', lineHeight: 1, color: brand.ink }}>
                {title}
              </div>
              <div style={{ ...fontMono, fontSize: 10, color: brand.red, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
                {subtitle}
              </div>
            </>
          ) : linea ? (
            <>
              <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 1, color: brand.ink, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{linea.emoji}</span>
                {linea.nombre} <span style={{ color: brand.red, marginLeft: 4 }}>· {linea.id}</span>
              </div>
              <div style={{ ...fontMono, fontSize: 10, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>
                Turno A · 06:00 — 14:00
              </div>
            </>
          ) : null}
        </div>
      </div>

      {showOps && currentOps.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {currentOps.map((op) => (
            <button
              key={op.id}
              onClick={() => onSelectOp(op.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px 4px 4px',
                borderRadius: 30,
                cursor: 'pointer',
                background: activeOpId === op.id ? brand.red : brand.white,
                border: `2px solid ${activeOpId === op.id ? brand.red : brand.line}`,
                transition: 'all .15s',
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: op.color,
                  color: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  ...fontDisplay,
                  fontWeight: 900,
                  fontSize: 13,
                }}
              >
                {op.initial}
              </div>
              <span style={{ ...fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: activeOpId === op.id ? 'white' : brand.ink }}>
                {op.name}
              </span>
            </button>
          ))}
          <button
            onClick={onAddOp}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: brand.redLight,
              color: brand.red,
              border: `2px solid ${brand.red}`,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      )}

      <div style={{ textAlign: 'right', flexShrink: 0, ...fontDisplay }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: brand.ink }}>{formatTime(currentTime)}</div>
        <div style={{ ...fontMono, fontSize: 10, color: '#888', letterSpacing: '0.15em' }}>{formatDate(currentTime)}</div>
      </div>
    </header>
  )
}

export function StatusBar({
  variant = 'ok',
  children,
}: {
  variant?: 'go' | 'ok' | 'warn' | 'bad' | 'default'
  children: React.ReactNode
}) {
  const bg = variant === 'go' || variant === 'ok' ? brand.ok : variant === 'warn' ? brand.warn : variant === 'bad' ? brand.red : '#444'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 24px',
        background: bg,
        color: variant === 'warn' ? brand.black : 'white',
        ...fontDisplay,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: variant === 'warn' ? brand.black : 'white',
          animation: 'pulse 1.4s infinite',
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  )
}
