'use client'

import { brand, fontDisplay } from '@/lib/brand'

const VARIANTS = {
  dark:  { bg: brand.black, color: brand.white },
  red:   { bg: brand.red,   color: brand.white },
  go:    { bg: brand.red,   color: brand.white },
  stop:  { bg: brand.black, color: brand.white },
  pause: { bg: brand.warn,  color: brand.black },
  ghost: { bg: brand.white, color: brand.black, border: `2px solid ${brand.black}` },
}

export function BigButton({ children, variant = 'dark', onClick, icon: Icon, disabled, emoji }) {
  const v = VARIANTS[variant]
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', marginBottom: 12,
      ...fontDisplay,
      background: disabled ? '#ccc' : v.bg,
      color: disabled ? '#666' : v.color,
      border: v.border || 'none',
      padding: '22px 16px', borderRadius: 12, fontWeight: 800, fontSize: 20, letterSpacing: '0.03em',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      textTransform: 'uppercase', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'all .15s', minHeight: 64,
    }}>
      {emoji && <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>}
      {Icon && !emoji && <Icon size={24} strokeWidth={2.5} />}
      {children}
    </button>
  )
}
