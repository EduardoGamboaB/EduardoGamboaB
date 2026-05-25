'use client'

import { ArrowLeft } from 'lucide-react'
import { brand, fontMono } from '@/mes/lib/brand'

export function TabletFrame({
  children,
  padding = 0,
  onExit,
}: {
  children: React.ReactNode
  padding?: number
  onExit: () => void
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px',
        background: brand.paper,
      }}
    >
      <button
        onClick={onExit}
        style={{
          alignSelf: 'flex-start',
          marginBottom: 14,
          color: brand.ink,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          ...fontMono,
          fontSize: 11,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          background: brand.white,
          border: `1px solid ${brand.line}`,
          padding: '8px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        <ArrowLeft size={14} /> Cambiar perfil
      </button>
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          aspectRatio: '16/10',
          background: brand.white,
          borderRadius: 18,
          boxShadow: '0 20px 50px -16px rgba(227,6,19,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${brand.line}`,
          padding,
        }}
      >
        {children}
      </div>
    </div>
  )
}
