import { brand, fontDisplay } from '@/lib/brand'

const VARIANTS = {
  default: { bg: '#ddd', color: '#666' },
  ok:      { bg: brand.ok, color: brand.white },
  warn:    { bg: brand.warn, color: brand.black },
  bad:     { bg: brand.red, color: brand.white },
  red:     { bg: brand.red, color: brand.white },
  dark:    { bg: brand.black, color: brand.white },
}

export function Badge({ children, variant = 'default' }) {
  const v = VARIANTS[variant]
  return (
    <span style={{
      ...fontDisplay,
      fontWeight: 700, fontSize: 10, letterSpacing: '0.08em',
      padding: '4px 10px', borderRadius: 6, textTransform: 'uppercase',
      background: v.bg, color: v.color, display: 'inline-block',
    }}>{children}</span>
  )
}
