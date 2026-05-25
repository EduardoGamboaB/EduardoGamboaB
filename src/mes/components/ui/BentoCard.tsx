'use client'

import { ChevronRight, LucideIcon } from 'lucide-react'
import { brand, fontDisplay, fontMono } from '@/mes/lib/brand'

type Size = 'sm' | 'md' | 'lg'

export function BentoCard({
  emoji,
  icon: Icon,
  label,
  sublabel,
  badge,
  active,
  hint,
  onClick,
  span = '1',
  size = 'md',
}: {
  emoji?: string
  icon?: LucideIcon
  label: string
  sublabel?: string
  badge?: string | number | null
  active?: boolean
  hint?: boolean
  onClick?: () => void
  span?: '1' | '2'
  size?: Size
}) {
  const sizes: Record<Size, { minH: number; emoji: number; label: number; sub: number }> = {
    sm: { minH: 80,  emoji: 24, label: 11, sub: 9 },
    md: { minH: 110, emoji: 36, label: 13, sub: 10 },
    lg: { minH: 140, emoji: 48, label: 16, sub: 11 },
  }
  const s = sizes[size]
  return (
    <button
      onClick={onClick}
      style={{
        gridColumn: span === '2' ? 'span 2' : 'auto',
        background: active ? brand.red : brand.white,
        border: `1.5px solid ${active ? brand.red : brand.line}`,
        borderRadius: 12,
        padding: span === '2' ? 16 : '16px 12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: span === '2' ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: span === '2' ? 'flex-start' : 'center',
        gap: span === '2' ? 14 : 10,
        textAlign: span === '2' ? 'left' : 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: s.minH,
        color: active ? brand.white : brand.ink,
        animation: hint ? 'hint-pulse 2s infinite' : 'none',
        boxShadow: active ? '0 4px 12px -2px rgba(227,6,19,0.35)' : '0 1px 2px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = brand.redLight
          e.currentTarget.style.borderColor = brand.red
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 12px -2px rgba(227,6,19,0.2)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = brand.white
          e.currentTarget.style.borderColor = brand.line
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'
        }
      }}
    >
      {emoji && <span style={{ fontSize: s.emoji, lineHeight: 1 }}>{emoji}</span>}
      {!emoji && Icon && (
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: active ? 'rgba(255,255,255,0.2)' : brand.redLight,
            color: active ? brand.white : brand.red,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
      )}
      <div style={{ flex: span === '2' ? 1 : 'unset' }}>
        <div
          style={{
            ...fontDisplay,
            fontWeight: 800,
            fontSize: s.label,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            lineHeight: 1.1,
            color: active ? brand.white : brand.ink,
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              ...fontMono,
              fontSize: s.sub,
              color: active ? 'rgba(255,255,255,0.9)' : '#888',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
      {span === '2' && <ChevronRight size={20} style={{ marginLeft: 'auto', color: active ? brand.white : brand.red, flexShrink: 0 }} />}
      {badge != null && badge !== '' && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: active ? brand.white : brand.red,
            color: active ? brand.red : brand.white,
            fontSize: 10,
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: 6,
            animation: 'pulse 1.8s infinite',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function BentoSection({
  icon: Icon,
  label,
  emoji,
}: {
  icon?: LucideIcon
  label: string
  emoji?: string
}) {
  return (
    <div style={{ gridColumn: 'span 2', padding: '14px 4px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
      {emoji && <span style={{ fontSize: 14 }}>{emoji}</span>}
      {Icon && <Icon size={13} color="#666" />}
      <span
        style={{
          ...fontMono,
          fontSize: 10,
          color: '#888',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#222' }} />
    </div>
  )
}
