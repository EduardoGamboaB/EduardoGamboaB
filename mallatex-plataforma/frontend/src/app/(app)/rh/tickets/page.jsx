'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Send } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put } from '@/lib/api'

// Mesa de ayuda RH: tickets de empleados con hilo de mensajes, respuesta y
// cambio de estado. Consume /api/rh/tickets.
const STATUS_META = {
  abierto: { label: 'Abierto', variant: 'bad' },
  en_proceso: { label: 'En proceso', variant: 'warn' },
  resuelto: { label: 'Resuelto', variant: 'ok' },
}
const STATUSES = ['abierto', 'en_proceso', 'resuelto']

function fmtTs(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function TicketsPage() {
  const { data, loading, error, reload } = useData('/api/rh/tickets')
  const tickets = asList(data)

  const [filter, setFilter] = useState('todos')
  const [openId, setOpenId] = useState(null)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { kind, text }

  const filtered = useMemo(() => {
    if (filter === 'todos') return tickets
    return tickets.filter((t) => String(t.status) === filter)
  }, [tickets, filter])

  const countBy = useMemo(() => {
    const c = { todos: tickets.length }
    for (const s of STATUSES) c[s] = tickets.filter((t) => String(t.status) === s).length
    return c
  }, [tickets])

  function toggle(id) {
    setOpenId((cur) => (cur === id ? null : id))
    setReply('')
    setMsg(null)
  }

  async function sendReply(t) {
    if (!reply.trim()) return
    setBusy(true)
    setMsg(null)
    try {
      await post(`/api/rh/tickets/${t.id}/reply`, { message: reply.trim() })
      setReply('')
      setMsg({ kind: 'ok', text: 'Respuesta enviada.' })
      reload()
    } catch (e) {
      setMsg({ kind: 'err', text: `No se pudo enviar la respuesta: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  async function changeStatus(t, status) {
    if (!status || status === t.status) return
    setBusy(true)
    setMsg(null)
    try {
      await put(`/api/rh/tickets/${t.id}`, { status })
      setMsg({ kind: 'ok', text: `Estado actualizado a "${STATUS_META[status]?.label || status}".` })
      reload()
    } catch (e) {
      setMsg({ kind: 'err', text: `No se pudo actualizar el estado: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Tickets de RH"
        subtitle="Mesa de ayuda: solicitudes y dudas de los empleados"
        code="MT-RH-TKT"
      />

      {error && <ErrorState error={error} />}

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {['todos', ...STATUSES].map((s) => (
          <button
            key={s}
            className={`btn btn-sm ${filter === s ? 'btn-dark' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s === 'todos' ? 'Todos' : STATUS_META[s].label} ({countBy[s] ?? 0})
          </button>
        ))}
      </div>

      {loading && !data ? (
        <Loading label="Cargando tickets…" />
      ) : filtered.length === 0 ? (
        <Card>
          <Empty title="Sin tickets" hint={filter === 'todos' ? 'No hay tickets registrados.' : 'No hay tickets con este estado.'} />
        </Card>
      ) : (
        filtered.map((t) => {
          const st = STATUS_META[t.status] || { label: t.status || '—', variant: 'muted' }
          const open = openId === t.id
          return (
            <Card
              key={t.id}
              title={t.subject || `Ticket #${t.id}`}
              actions={
                <div className="row wrap" style={{ gap: 8 }}>
                  <Badge variant={st.variant}>{st.label}</Badge>
                  <button className="btn btn-sm btn-ghost" onClick={() => toggle(t.id)}>
                    {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    {open ? 'Cerrar' : 'Ver hilo'}
                  </button>
                </div>
              }
            >
              <div className="card-body">
                <p className="muted" style={{ fontSize: 13 }}>
                  {t.employeeName || `Empleado #${t.employeeId}`} · {t.category || 'General'} ·{' '}
                  {(t.messages || []).length} mensaje{(t.messages || []).length === 1 ? '' : 's'}
                </p>

                {open && (
                  <div style={{ marginTop: 12 }}>
                    {msg && (
                      <div className={`alert ${msg.kind === 'err' ? 'alert-err' : 'alert-info'}`}>{msg.text}</div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                      {(t.messages || []).map((m, i) => {
                        const isRh = m.role !== 'empleado'
                        return (
                          <div
                            key={i}
                            style={{
                              border: '1px solid var(--line-2)',
                              borderLeft: `3px solid ${isRh ? 'var(--red)' : 'var(--gray-400)'}`,
                              borderRadius: 8,
                              padding: '8px 12px',
                              background: isRh ? 'var(--line-2)' : 'transparent',
                            }}
                          >
                            <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                              <strong style={{ fontSize: 13 }}>
                                {m.by || '—'} <span className="muted" style={{ fontWeight: 400 }}>({m.role || '—'})</span>
                              </strong>
                              <span className="muted" style={{ fontSize: 12 }}>{fmtTs(m.at || m.ts)}</span>
                            </div>
                            <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                          </div>
                        )
                      })}
                      {(t.messages || []).length === 0 && <p className="muted">Sin mensajes en este ticket.</p>}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        sendReply(t)
                      }}
                    >
                      <textarea
                        placeholder="Escribe una respuesta para el empleado…"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        style={{ width: '100%', marginBottom: 8 }}
                      />
                      <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between' }}>
                        <label className="row" style={{ gap: 6, fontSize: 13 }}>
                          <span className="muted">Estado:</span>
                          <select
                            value={t.status || 'abierto'}
                            onChange={(e) => changeStatus(t, e.target.value)}
                            disabled={busy}
                            style={{ minHeight: 36 }}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{STATUS_META[s].label}</option>
                            ))}
                          </select>
                        </label>
                        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !reply.trim()}>
                          <Send size={14} />
                          {busy ? 'Enviando…' : 'Responder'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
