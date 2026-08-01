import { brand, fontDisplay, fontMono } from '@/lib/brand'

const ACCENT = {
  default: brand.black,
  red: brand.red,
  warn: brand.warn,
  bad: brand.red,
  ok: brand.ok,
}

export function Stat({ label, value, delta, variant = 'default', emoji }) {
  const a = ACCENT[variant]
  return (
    <div style={{
      background: brand.white, border: `1px solid ${brand.line}`,
      padding: 18, position: 'relative', overflow: 'hidden', borderRadius: 10,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: a }} />
      {emoji && <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 22, opacity: 0.4 }}>{emoji}</div>}
      <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.2em', color: '#888', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 32, lineHeight: 1 }}>{value}</div>
      {delta && (
        <div style={{ ...fontMono, fontSize: 10, marginTop: 6, color: delta.up ? brand.ok : delta.down ? brand.red : '#666', fontWeight: 600 }}>
          {delta.up ? '▲' : delta.down ? '▼' : '·'} {delta.text}
        </div>
      )}
    </div>
  )
}
