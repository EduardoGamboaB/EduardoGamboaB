import { brand, fontDisplay, fontMono } from '@/lib/brand'

const ACCENT = {
  default: brand.ink,
  red: brand.red,
  warn: brand.warn,
  bad: brand.bad,
  ok: brand.ok,
}

// Tarjeta KPI con barra de acento (feel MES) — responsiva por el grid contenedor.
export function Stat({ label, value, sub, variant = 'default', icon: Icon }) {
  const a = ACCENT[variant] || ACCENT.default
  return (
    <div className="card" style={{ position: 'relative', padding: 16, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: a }} />
      {Icon && (
        <div style={{ position: 'absolute', top: 12, right: 14, color: a, opacity: 0.35 }}>
          <Icon size={22} />
        </div>
      )}
      <div style={{ ...fontMono, fontSize: 10, letterSpacing: '.16em', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 30, lineHeight: 1.05, marginTop: 6, color: brand.ink }}>
        {value}
      </div>
      {sub && <div style={{ ...fontMono, fontSize: 11, color: brand.gray, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}
