'use client'

import { useState } from 'react'
import { Send, Sparkles, Check } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { useApp } from '@/lib/context'

const DEMO_REPLY = 'Modo demo · esta versión muestra respuestas pregrabadas. La integración con Claude API se activa en Fase 4 (ver docs/modulo-ia-consultiva.md).'

export function ChatPane() {
  const { aiConversations } = useApp()
  const [activeId, setActiveId] = useState(aiConversations[0]?.id)
  const [input, setInput] = useState('')
  const [localExtra, setLocalExtra] = useState([])  // mensajes nuevos solo de sesión

  const conv = aiConversations.find((c) => c.id === activeId) ?? aiConversations[0]
  if (!conv) return <Empty />

  const handleSend = () => {
    if (!input.trim()) return
    setLocalExtra((prev) => [...prev,
      { from: 'user', text: input.trim() },
      { from: 'ia', text: DEMO_REPLY, demo: true },
    ])
    setInput('')
  }

  const messages = [...conv.messages, ...localExtra]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Selector de conversación */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${brand.line}`, background: brand.white }}>
        <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
          ◆ Conversaciones recientes
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {aiConversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} style={{
              textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: c.id === conv.id ? brand.redLight : 'transparent',
              ...fontBody, fontSize: 13,
              color: c.id === conv.id ? brand.redDark : brand.ink,
              fontWeight: c.id === conv.id ? 700 : 500,
            }}>{c.title}</button>
          ))}
        </div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {messages.map((m, i) => <Message key={i} m={m} />)}
      </div>

      {/* Input */}
      <div style={{ borderTop: `1px solid ${brand.line}`, padding: 12, background: brand.white, display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pregúntale al IA del MES…"
          style={{
            flex: 1, padding: '10px 12px', border: `1px solid ${brand.line}`, borderRadius: 8,
            ...fontBody, fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={handleSend} aria-label="Enviar" style={{
          background: brand.red, color: 'white', border: 'none', borderRadius: 8,
          padding: '10px 14px', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

function Message({ m }) {
  if (m.from === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
        <div style={{
          background: brand.black, color: 'white',
          padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
          ...fontBody, fontSize: 13, lineHeight: 1.5,
        }}>{m.text}</div>
      </div>
    )
  }
  // IA
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Sparkles size={11} color={brand.red} />
        <span style={{ ...fontMono, fontSize: 9, letterSpacing: '0.18em', color: brand.red, textTransform: 'uppercase', fontWeight: 700 }}>
          IA Pro {m.demo && '· demo'}
        </span>
      </div>
      <div style={{
        background: brand.white, color: brand.ink,
        padding: '12px 14px', borderRadius: '4px 14px 14px 14px',
        border: `1px solid ${brand.line}`,
        ...fontBody, fontSize: 13, lineHeight: 1.55,
      }}>{m.text}</div>

      {m.rationale && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#fafafa', borderLeft: `2px solid ${brand.line}`, borderRadius: 4 }}>
          <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.18em', color: '#888', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Razonamiento
          </div>
          <div style={{ ...fontBody, fontSize: 11, color: '#555', lineHeight: 1.5 }}>{m.rationale}</div>
        </div>
      )}

      {m.actions && m.actions.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.18em', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>
            ◆ Recomendaciones accionables
          </div>
          {m.actions.map((a) => <ActionCard key={a.id} action={a} />)}
        </div>
      )}
    </div>
  )
}

function ActionCard({ action }) {
  const [applied, setApplied] = useState(false)
  return (
    <div style={{
      background: brand.white, border: `1px solid ${brand.line}`,
      borderLeft: `3px solid ${brand.red}`, borderRadius: 6,
      padding: '10px 12px',
      opacity: applied ? 0.55 : 1,
    }}>
      <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 12, color: brand.ink, lineHeight: 1.3, textTransform: 'uppercase' }}>
        {action.label}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, ...fontMono, fontSize: 10, color: '#666' }}>
        <span><b style={{ color: brand.ok }}>{action.impact}</b> impacto</span>
        <span>riesgo {action.risk}</span>
      </div>
      <button
        disabled={applied}
        onClick={() => setApplied(true)}
        style={{
          marginTop: 8, padding: '6px 12px',
          background: applied ? '#e8f5e9' : brand.red, color: applied ? brand.ok : 'white',
          border: 'none', borderRadius: 4, cursor: applied ? 'default' : 'pointer',
          ...fontDisplay, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        {applied ? <><Check size={12} /> Aplicada</> : 'Aplicar'}
      </button>
    </div>
  )
}

function Empty() {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: '#999' }}>
      Sin conversaciones todavía.
    </div>
  )
}
