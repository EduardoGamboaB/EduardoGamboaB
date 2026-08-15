'use client'

import { useEffect, useMemo, useState } from 'react'
import { ImageOff, CheckCircle2, XCircle, UploadCloud, MapPin, Sprout } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { API_BASE, getToken, post } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// Marketing · Aportes de campo. Contenido que los vendedores suben desde la app
// (fotos de proyectos + contexto). Marketing revisa, aprueba/rechaza y publica
// al banco de contenido como caso de éxito. Sentido inverso al resto del módulo.

const ESTADOS = [
  { id: '', label: 'Todos' },
  { id: 'nuevo', label: 'En revisión' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'publicado', label: 'Publicados' },
  { id: 'rechazado', label: 'Rechazados' },
]
const ESTADO_BADGE = {
  nuevo: { v: 'warn', l: 'En revisión' },
  aprobado: { v: 'info', l: 'Aprobado' },
  publicado: { v: 'ok', l: 'Publicado' },
  rechazado: { v: 'muted', l: 'Rechazado' },
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Miniatura autenticada de una foto de aporte (Bearer + objectURL). */
function FieldPhoto({ photoId, alt = '' }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    let url = null
    setSrc(null); setFailed(false)
    const token = getToken()
    fetch(`${API_BASE}/api/mkt/field-posts/photos/${photoId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob() })
      .then((blob) => { if (!alive) return; url = URL.createObjectURL(blob); setSrc(url) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [photoId])

  const box = { width: 104, height: 104, borderRadius: 8, background: 'var(--line-2, #eeeef0)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flex: 'none' }
  if (failed) return <div style={box} title="Vista previa no disponible"><ImageOff size={20} style={{ opacity: 0.35 }} /></div>
  if (!src) return <div style={box}><div className="spinner" /></div>
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" style={box} title="Abrir foto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </a>
  )
}

function AporteCard({ ap, onAction, busy }) {
  const badge = ESTADO_BADGE[ap.estado] || { v: 'muted', l: ap.estado }
  const meta = [ap.producto, ap.cliente].filter(Boolean).join(' · ')
  return (
    <Card
      title={
        <span className="row wrap" style={{ gap: 8, alignItems: 'center' }}>
          <span style={{ ...fontMono, color: brand.red, fontSize: 12 }}>{ap.folio || 'APC'}</span>
          <Badge variant={badge.v}>{badge.l}</Badge>
        </span>
      }
      actions={<span className="muted" style={{ fontSize: 12 }}>{fmtDate(ap.createdAt)}</span>}
    >
      <div className="card-body">
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{ap.titulo}</div>
        <div className="row wrap" style={{ gap: 12, marginBottom: 8 }}>
          <span className="muted" style={{ fontSize: 13 }}>👤 {ap.autor}</span>
          {ap.ubicacion && <span className="muted" style={{ fontSize: 13 }}><MapPin size={12} style={{ verticalAlign: '-2px' }} /> {ap.ubicacion}</span>}
          {ap.cultivo && <span className="muted" style={{ fontSize: 13 }}><Sprout size={12} style={{ verticalAlign: '-2px' }} /> {ap.cultivo}</span>}
        </div>
        {!!meta && <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{meta}</div>}
        {!!ap.contexto && <p style={{ margin: '0 0 12px', fontSize: 14, lineHeight: 1.5 }}>{ap.contexto}</p>}

        <div className="row wrap" style={{ gap: 8 }}>
          {(ap.fotos || []).map((f) => <FieldPhoto key={f.id} photoId={f.id} alt={ap.titulo} />)}
          {(ap.fotos || []).length === 0 && <span className="muted" style={{ fontSize: 12 }}>Sin fotos.</span>}
        </div>

        {!!ap.notaMarketing && (
          <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>💬 {ap.notaMarketing}</div>
        )}
        {ap.estado === 'publicado' && (
          <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            ✓ Publicado al banco de contenido ({(ap.publicadoAssetIds || []).length} imagen/es).
          </p>
        )}

        {(ap.estado === 'nuevo' || ap.estado === 'aprobado') && (
          <div className="page-actions" style={{ marginTop: 14 }}>
            {ap.estado === 'nuevo' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => onAction('aprobar', ap)}>
                <CheckCircle2 size={15} /> Aprobar
              </button>
            )}
            {ap.estado === 'aprobado' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => onAction('publicar', ap)}>
                <UploadCloud size={15} /> Publicar al banco
              </button>
            )}
            <button className="btn btn-ghost" disabled={busy} onClick={() => onAction('rechazar', ap)}>
              <XCircle size={15} /> Rechazar
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function AportesPage() {
  const [estado, setEstado] = useState('')
  const qs = useMemo(() => (estado ? `?estado=${estado}` : ''), [estado])
  const { data, loading, error, reload } = useData(`/api/mkt/field-posts${qs}`)
  const aportes = asList(data)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)

  async function onAction(kind, ap) {
    setMsg(null)
    try {
      if (kind === 'aprobar') {
        setBusyId(ap.id)
        await post(`/api/mkt/field-posts/${ap.id}/estado`, { estado: 'aprobado' })
        setMsg({ ok: true, text: `${ap.folio} aprobado.` })
      } else if (kind === 'rechazar') {
        const nota = typeof window !== 'undefined' ? window.prompt('Motivo del rechazo (se comparte con el vendedor):', '') : ''
        if (nota === null) return
        setBusyId(ap.id)
        await post(`/api/mkt/field-posts/${ap.id}/estado`, { estado: 'rechazado', notaMarketing: nota })
        setMsg({ ok: true, text: `${ap.folio} rechazado.` })
      } else if (kind === 'publicar') {
        setBusyId(ap.id)
        const r = await post(`/api/mkt/field-posts/${ap.id}/publicar`, {})
        setMsg({ ok: true, text: `${ap.folio} publicado al banco (${(r.publicadoAssetIds || []).length} imagen/es).` })
      }
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo completar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Aportes de campo"
        subtitle="Proyectos que los vendedores suben desde la app: revisa, aprueba y publícalos al banco como casos de éxito"
        code="MT-MKT-APC"
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <Card title="Bandeja de aportes">
        <div className="card-body">
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            {ESTADOS.map((e) => (
              <button key={e.id} className={`btn btn-sm ${estado === e.id ? 'btn-dark' : ''}`} onClick={() => setEstado(e.id)}>
                {e.label}
              </button>
            ))}
          </div>

          {loading && !data ? (
            <Loading label="Cargando aportes…" />
          ) : aportes.length === 0 ? (
            <Empty title="Sin aportes" hint="Cuando un vendedor suba fotos de un proyecto desde su app, aparecerán aquí para revisión." />
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 14, alignItems: 'start' }}>
              {aportes.map((ap) => (
                <AporteCard key={ap.id} ap={ap} onAction={onAction} busy={busyId === ap.id} />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
