'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { useApp } from '@/lib/context'

export function ForecastsPane() {
  const { aiForecasts } = useApp()

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FCard title="Cumplimiento de entregas" horizonte={aiForecasts.cumplimiento.horizonte}>
        <Donut value={aiForecasts.cumplimiento.pronosticoOnTime} label="on-time" />
        <div style={{ marginTop: 10 }}>
          {aiForecasts.cumplimiento.enRiesgo.map((p) => (
            <Row key={p.pedido}
              left={<><b style={{ color: brand.red }}>{p.pedido}</b> · {p.cliente}</>}
              right={<span style={{
                ...fontMono, fontSize: 11, fontWeight: 700,
                color: p.dias < 0 ? brand.red : p.dias > 0 ? brand.ok : brand.warn,
              }}>{p.dias > 0 ? '+' : ''}{p.dias} d</span>}
            />
          ))}
        </div>
      </FCard>

      <FCard title="OEE proyectado por línea" horizonte={aiForecasts.oee.horizonte}>
        <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 28, color: brand.red, textAlign: 'center', marginBottom: 8 }}>
          {aiForecasts.oee.promedioProyectado}% <span style={{ ...fontMono, fontSize: 10, color: '#888', letterSpacing: '0.2em', fontWeight: 600, marginLeft: 4 }}>PROM</span>
        </div>
        {aiForecasts.oee.porLinea.map((l) => (
          <Row key={l.linea}
            left={<b style={{ ...fontMono, fontSize: 11, fontWeight: 700 }}>{l.linea}</b>}
            middle={<Bar value={l.proyectado} />}
            right={<TendenciaPill tendencia={l.tendencia} value={l.proyectado} />}
          />
        ))}
      </FCard>

      <FCard title="Demanda por familia" horizonte={aiForecasts.demanda.horizonte}>
        {aiForecasts.demanda.porFamilia.map((f) => (
          <Row key={f.familia}
            left={<span style={{ ...fontBody, fontSize: 12 }}>{f.familia}</span>}
            middle={<Bar value={(f.m2Proyectados / 412000) * 100} />}
            right={
              <span style={{ ...fontMono, fontSize: 10, fontWeight: 700, color: f.vsAnterior.startsWith('+') ? brand.ok : brand.red }}>
                {f.vsAnterior}
              </span>
            }
          />
        ))}
      </FCard>

      <FCard title="Carga por operador" horizonte={aiForecasts.carga.horizonte}>
        {aiForecasts.carga.porOperador.map((o) => {
          const sobrecargado = o.sobrecarga.startsWith('+')
          const pct = (o.asignadoHr / o.capacidadHr) * 100
          return (
            <Row key={o.operador}
              left={<><b style={{ fontSize: 12 }}>{o.operador}</b> <span style={{ ...fontMono, fontSize: 10, color: '#888', marginLeft: 4 }}>{o.linea}</span></>}
              middle={<Bar value={Math.min(100, pct)} color={sobrecargado ? brand.warn : brand.ok} />}
              right={
                <span style={{ ...fontMono, fontSize: 10, fontWeight: 700, color: sobrecargado ? brand.warn : '#888' }}>
                  {o.sobrecarga}
                </span>
              }
            />
          )
        })}
      </FCard>
    </div>
  )
}

// ----- helpers visuales (SVG/CSS sin librerías externas) -----

function FCard({ title, horizonte, children }) {
  return (
    <section style={{ background: brand.white, border: `1px solid ${brand.line}`, borderRadius: 8, padding: 14 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${brand.line}` }}>
        <h4 style={{ ...fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</h4>
        <span style={{ ...fontMono, fontSize: 9, color: brand.red, letterSpacing: '0.15em', fontWeight: 700, textTransform: 'uppercase' }}>{horizonte}</span>
      </header>
      {children}
    </section>
  )
}

function Donut({ value, label }) {
  const angle = (value / 100) * 360
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '4px 0' }}>
      <div style={{
        width: 110, height: 110, borderRadius: '50%',
        background: `conic-gradient(${brand.red} 0 ${angle}deg, ${brand.line} ${angle}deg 360deg)`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 14, background: 'white', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 28 }}>{value}%</div>
            <div style={{ ...fontMono, fontSize: 8, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bar({ value, color = brand.red }) {
  return (
    <div style={{ flex: 1, height: 6, background: brand.line, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color }} />
    </div>
  )
}

function Row({ left, middle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <div style={{ minWidth: 110 }}>{left}</div>
      {middle && <div style={{ flex: 1 }}>{middle}</div>}
      <div style={{ minWidth: 50, textAlign: 'right' }}>{right}</div>
    </div>
  )
}

function TendenciaPill({ tendencia, value }) {
  const map = {
    up:   { icon: ArrowUp,   color: brand.ok },
    down: { icon: ArrowDown, color: brand.red },
    flat: { icon: Minus,     color: '#888' },
  }
  const m = map[tendencia] ?? map.flat
  const Icon = m.icon
  return (
    <span style={{ ...fontMono, fontSize: 10, fontWeight: 700, color: m.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} /> {value}%
    </span>
  )
}
