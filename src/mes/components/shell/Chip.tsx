'use client'

import { brand, fontDisplay } from '@/mes/lib/brand'

export function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode
  on?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...fontDisplay,
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: on ? brand.black : brand.paper2,
        color: on ? 'white' : '#555',
        padding: '6px 12px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
