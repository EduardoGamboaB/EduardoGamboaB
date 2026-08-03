'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Send, Paintbrush, PackageCheck, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// Marketing · Solicitudes de formatos / diseños de los vendedores. Tablero por
// estado con hilo de mensajes y flujo solicitado → en diseño → entregado.

const ESTADOS = [
  { id: 'solicitado', label: 'Solicitado', variant: 'bad', color: brand.bad },
  { id: 'en_diseno', label: 'En diseño', variant: 'warn', color: brand.warn },
  { id: 'entregado', label: 'Entregado', variant: 'ok', color: brand.ok },
  { id: 'rechazado', label: 'Rechazado', variant: 'muted', color: brand.gray400 },
]

function fmtTs(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function RequestCard({ req, open, onToggle, assets, busy, onMessage, onEstado }) {
  const [reply, setReply] = useState('')
  const [entregando, setEntregando] = useState(false)
  const [entregableId, setEntregableId] = useState('')

  const msgs = req.mensajes || []

  return (
    <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between' }}>
        <ProcessTag code={req.folio || `FMT-${req.id}`} />
        <span className="muted" style={{ ...fontMono, fontSize: 11 }}>{fmtTs(req.createdAt)}</span>
      </div>
      <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{req.titulo || 'Sin título'}</div>
      <div className="muted" style={{ fontSize: 12 }}>Solicita: {req.solicitante || '—'}</div>

      <button className="btn btn-sm btn-ghost" onClick={onToggle} style={{ alignSelf: 'flex-start' }}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {open ? 'Cerrar' : 'Detalle'} ({msgs.length})
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {req.descripcion && (
            <p style={{ fontSize: 13, margin: 0, whiteSpace: 'pre-wrap' }}>{req.descripcion}</p>
          )}

          {/* Hilo de mensajes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {msgs.map((m, i) => {
              const isMkt = m.role !== 'vendedor' && m.role !== 'solicitante'
              return (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--line-2)',
                    borderLeft: `3px solid ${isMkt ? 'var(--red)' : 'var(--gray-400, #a7a8ac)'}`,
                    borderRadius: 8,
                    padding: '6px 10px',
                    background: isMkt ? 'var(--line-2)' : 'transparent',
                  }}
                >
                  <div className="row wrap" style={{ justifyContent: 'space-between', gap: 6 }}>
                    <strong style={{ fontSize: 12 }}>
                      {m.by || '—'} <span className="muted" style={{ fontWeight: 400 }}>({m.role || '—'})</span>
                    </strong>
                    <span className="muted" style={{ fontSize: 11 }}>{fmtTs(m.at)}</span>
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.message}</div>
                </div>
              )
            })}
            {msgs.length === 0 && <p className="muted" style={{ fontSize: 12, margin: 0 }}>Sin mensajes.</p>}
          </div>

          {/* Responder */}
          <form
            className="row"
            style={{ gap: 6, alignItems: 'stretch' }}
            onSubmit={(e) => {
              e.preventDefault()
              if (!reply.trim()) return
              onMessage(req, reply.trim(), () => setReply(''))
            }}
          >
            <input
              placeholder="Responder…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="btn btn-sm" type="submit" disabled={busy || !reply.trim()} title="Enviar">
              <Send size={14} />
            </button>
          </form>

          {/* Acciones de estado */}
          <div className="row wrap" style={{ gap: 6 }}>
            {req.estado === 'solicitado' && (
              <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => onEstado(req, 'en_diseno')}>
                <Paintbrush size={13} /> Tomar en diseño
              </button>
            )}
            {(req.estado === 'solicitado' || req.estado === 'en_diseno') && (
              <>
                <button className="btn btn-sm" disabled={busy} onClick={() => setEntregando((v) => !v)}>
                  <PackageCheck size={13} /> Entregar
                </button>
                <button className="btn btn-sm btn-ghost" disabled={busy} onClick={() => onEstado(req, 'rechazado')}>
                  <XCircle size={13} /> Rechazar
                </button>
              </>
            )}
          </div>

          {entregando && (
            <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: 10 }}>
              <label style={{ fontSize: 12 }}>Entregable del banco de contenido
                <select value={entregableId} onChange={(e) => setEntregableId(e.target.value)} style={{ width: '100%' }}>
                  <option value="">Seleccionar asset…</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.titulo || `#${a.id}`} ({a.tipo})</option>
                  ))}
                </select>
              </label>
              <div className="row" style={{ gap: 6, marginTop: 8 }}>
                <button
                  className="btn btn-sm btn-primary"
                  disabled={busy || !entregableId}
                  onClick={() => onEstado(req, 'entregado', Number(entregableId), () => setEntregando(false))}
                >
                  Confirmar entrega
                </button>
                <button className="btn btn-sm" onClick={() => setEntregando(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function FormatosPage() {
  const { data, loading, error, reload } = useData('/api/mkt/format-requests')
  const assetsQ = useData('/api/mkt/assets')
  const requests = asList(data)
  const assets = asList(assetsQ.data)

  const [openId, setOpenId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const byEstado = useMemo(() => {
    const map = {}
    for (const e of ESTADOS) map[e.id] = []
    for (const r of requests) (map[r.estado] || (map[r.estado] = [])).push(r)
    return map
  }, [requests])

  async function sendMessage(req, message, onDone) {
    setBusy(true)
    setMsg(null)
    try {
      await post(`/api/mkt/format-requests/${req.id}/message`, { message })
      onDone?.()
      setMsg({ ok: true, text: 'Mensaje enviado.' })
      reload()
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo enviar el mensaje: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  async function changeEstado(req, estado, entregableAssetId, onDone) {
    setBusy(true)
    setMsg(null)
    try {
      const body = { estado }
      if (entregableAssetId) body.entregableAssetId = entregableAssetId
      await post(`/api/mkt/format-requests/${req.id}/estado`, body)
      onDone?.()
      const label = ESTADOS.find((e) => e.id === estado)?.label || estado
      setMsg({ ok: true, text: `Solicitud ${req.folio || `FMT-${req.id}`} → ${label}.` })
      reload()
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo cambiar el estado: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Solicitudes de formatos"
        subtitle="Diseños y formatos que piden los vendedores: solicitado → en diseño → entregado"
        code="MT-MKT-FMT"
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {loading && !data ? (
        <Loading label="Cargando solicitudes…" />
      ) : requests.length === 0 && !error ? (
        <Empty title="Sin solicitudes" hint="Las solicitudes de los vendedores aparecerán aquí." />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12, alignItems: 'start' }}>
          {ESTADOS.map((e) => (
            <div key={e.id} style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <div
                className="row"
                style={{
                  gap: 8, padding: '8px 12px', borderRadius: 8,
                  borderTop: `3px solid ${e.color}`, background: 'var(--line-2, #eeeef0)',
                }}
              >
                <strong style={{ fontSize: 13 }}>{e.label}</strong>
                <Badge variant={e.variant}>{(byEstado[e.id] || []).length}</Badge>
              </div>
              {(byEstado[e.id] || []).map((r) => (
                <RequestCard
                  key={r.id}
                  req={r}
                  open={openId === r.id}
                  onToggle={() => setOpenId((cur) => (cur === r.id ? null : r.id))}
                  assets={assets}
                  busy={busy}
                  onMessage={sendMessage}
                  onEstado={changeEstado}
                />
              ))}
              {(byEstado[e.id] || []).length === 0 && (
                <p className="muted" style={{ fontSize: 12, textAlign: 'center', margin: 0 }}>—</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
