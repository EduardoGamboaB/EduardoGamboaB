'use client'

import { useState } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { useApp } from '@/lib/context'

export function InsightsPane() {
  const { aiInsights } = useApp()
  const [activeId, setActiveId] = useState(aiInsights[0]?.id)
  const ins = aiInsights.find((i) => i.id === activeId) ?? aiInsights[0]
  if (!ins) return null

  return (
    <div style={{ padding: 16 }}>
      {/* Selector de semana */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {aiInsights.map((i) => (
          <button key={i.id} onClick={() => setActiveId(i.id)} style={{
            ...fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: i.id === ins.id ? brand.black : brand.white,
            color: i.id === ins.id ? 'white' : brand.ink,
            border: `1px solid ${brand.line}`, borderRadius: 4,
            padding: '6px 10px', cursor: 'pointer',
          }}>{i.semana.split(' · ')[0]}</button>
        ))}
      </div>

      <article style={{ background: brand.white, border: `1px solid ${brand.line}`, borderRadius: 8, padding: 18 }}>
        <header style={{ borderBottom: `2px solid ${brand.black}`, paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Sparkles size={14} color={brand.red} />
            <span style={{ ...fontMono, fontSize: 9, color: brand.red, letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase' }}>
              Carta semanal · {ins.autor}
            </span>
          </div>
          <h3 style={{ ...fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', lineHeight: 1.2 }}>
            {ins.semana}
          </h3>
        </header>

        <p style={{ ...fontBody, fontSize: 13, color: '#333', lineHeight: 1.6, marginBottom: 16 }}>
          {ins.resumen}
        </p>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 18 }}>
          {ins.kpis.map((k, i) => (
            <div key={i} style={{ background: brand.paper, padding: 10, borderRadius: 6, borderLeft: `3px solid ${brand.red}` }}>
              <div style={{ ...fontMono, fontSize: 9, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>{k.label}</div>
              <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 18, lineHeight: 1, marginTop: 4 }}>{k.value}</div>
              {k.delta && <div style={{ ...fontMono, fontSize: 10, color: brand.ok, marginTop: 4, fontWeight: 600 }}>{k.delta}</div>}
            </div>
          ))}
        </div>

        {/* Oportunidades */}
        <Section title="Oportunidades" icon={Target} color={brand.ok} items={ins.oportunidades} />
        <Section title="Riesgos"        icon={AlertTriangle} color={brand.warn} items={ins.riesgos} />

        {/* Plan sugerido */}
        <div style={{ marginTop: 14, padding: 12, background: brand.redLight, border: `1px solid ${brand.red}`, borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TrendingUp size={14} color={brand.red} />
            <span style={{ ...fontMono, fontSize: 9, color: brand.red, letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase' }}>
              Plan sugerido
            </span>
          </div>
          <div style={{ ...fontBody, fontSize: 12, color: brand.redDark, lineHeight: 1.55 }}>{ins.plan}</div>
        </div>
      </article>
    </div>
  )
}

function Section({ title, icon: Icon, color, items }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon size={14} color={color} />
        <span style={{ ...fontMono, fontSize: 9, color, letterSpacing: '0.2em', fontWeight: 700, textTransform: 'uppercase' }}>
          ◆ Top {items.length} {title}
        </span>
      </div>
      <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <li key={i} style={{ ...fontBody, fontSize: 12, color: '#444', lineHeight: 1.5 }}>
            <b style={{ color: brand.ink }}>{it.titulo}.</b> {it.detalle}
          </li>
        ))}
      </ol>
    </div>
  )
}
