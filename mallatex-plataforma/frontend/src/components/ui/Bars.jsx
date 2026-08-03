import { fontMono } from '@/lib/brand'

// Barra de progreso "chart-lite". pct 0..100.
export function Bar({ pct = 0, color }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${v}%`, ...(color ? { background: color } : {}) }} />
    </div>
  )
}

// Lista de barras etiquetadas (para desgloses de líneas/estados).
export function BarList({ items }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((it, i) => (
        <div key={i}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>{it.label}</span>
            <span style={{ ...fontMono, fontSize: 12, color: '#666' }}>{it.value != null ? it.value : `${Math.round(it.pct)}%`}</span>
          </div>
          <Bar pct={it.pct} color={it.color} />
        </div>
      ))}
    </div>
  )
}
