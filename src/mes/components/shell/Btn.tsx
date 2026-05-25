'use client'

import { LucideIcon } from 'lucide-react'
import { brand, fontDisplay } from '@/mes/lib/brand'

type Variant = 'dark' | 'primary' | 'ok' | 'ghost'

export function Btn({
  children,
  variant = 'dark',
  icon: Icon,
  emoji,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: Variant
  icon?: LucideIcon
  emoji?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const variants: Record<Variant, { bg: string; color: string; border: string }> = {
    dark:    { bg: brand.black, color: 'white', border: brand.black },
    primary: { bg: brand.red,   color: 'white', border: brand.red },
    ok:      { bg: brand.ok,    color: 'white', border: brand.ok },
    ghost:   { bg: 'white',     color: 'black', border: brand.line },
  }
  const v = variants[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...fontDisplay,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: disabled ? '#ccc' : v.bg,
        color: disabled ? '#666' : v.color,
        border: `1px solid ${disabled ? '#ccc' : v.border}`,
        padding: '10px 16px',
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.6 : 1,
        minHeight: 42,
      }}
    >
      {emoji && <span style={{ fontSize: 14, lineHeight: 1 }}>{emoji}</span>}
      {!emoji && Icon && <Icon size={14} />}
      {children}
    </button>
  )
}
