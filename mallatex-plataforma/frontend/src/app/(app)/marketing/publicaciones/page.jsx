'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Copy, Check, Trash2, Megaphone } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { AssetThumb } from '@/components/AssetThumb'
import { useData, asList } from '@/lib/useData'
import { post, del } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// Marketing · Publicaciones para redes sociales. Feed descendente con copy
// listo para copiar, asset vinculado del banco y campaña. Los vendedores lo
// consumen desde su app móvil.

const REDES = {
  whatsapp: { label: 'WhatsApp', bg: '#25D366', fg: '#fff' },
  facebook: { label: 'Facebook', bg: '#1877F2', fg: '#fff' },
  instagram: { label: 'Instagram', bg: '#E1306C', fg: '#fff' },
  tiktok: { label: 'TikTok', bg: '#232121', fg: '#fff' },
}

function RedBadge({ red }) {
  const r = REDES[String(red || '').toLowerCase()] || { label: red || '—', bg: brand.gray, fg: '#fff' }
  return (
    <span
      className="badge"
      style={{ background: r.bg, color: r.fg, border: 'none' }}
    >
      {r.label}
    </span>
  )
}

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PublicacionesPage() {
  const { data, loading, error, reload } = useData('/api/mkt/posts')
  const assetsQ = useData('/api/mkt/assets')
  const campaignsQ = useData('/api/mkt/campaigns')

  const posts = asList(data)
  const assets = asList(assetsQ.data)
  const campaigns = asList(campaignsQ.data)

  const [form, setForm] = useState(null)
  const [assetQ, setAssetQ] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const [msg, setMsg] = useState(null)

  const feed = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [posts]
  )

  const filteredAssets = useMemo(() => {
    const s = assetQ.trim().toLowerCase()
    if (!s) return assets
    return assets.filter((a) =>
      [a.titulo, a.categoria, a.productSku].some((v) => String(v || '').toLowerCase().includes(s))
    )
  }, [assets, assetQ])

  const campaignName = (id) => {
    const c = campaigns.find((x) => String(x.id) === String(id))
    return c ? c.nombre : null
  }

  function openForm() {
    setForm({ titulo: '', copyTexto: '', red: 'whatsapp', assetId: '', campaignId: '' })
    setAssetQ('')
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mkt/posts', {
        titulo: form.titulo,
        copyTexto: form.copyTexto,
        red: form.red,
        assetId: form.assetId ? Number(form.assetId) : null,
        campaignId: form.campaignId ? Number(form.campaignId) : null,
      })
      setForm(null)
      setMsg({ ok: true, text: 'Publicación creada. Los vendedores la verán en su app.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo publicar: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function remove(p) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar la publicación "${p.titulo}"?`)) return
    setBusyId(p.id)
    setMsg(null)
    try {
      await del(`/api/mkt/posts/${p.id}`)
      setMsg({ ok: true, text: 'Publicación eliminada.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo eliminar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  async function copyText(p) {
    try {
      await navigator.clipboard.writeText(p.copyTexto || '')
      setCopiedId(p.id)
      setTimeout(() => setCopiedId((cur) => (cur === p.id ? null : cur)), 2000)
    } catch {
      setMsg({ ok: false, text: 'No se pudo copiar el texto al portapapeles.' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Publicaciones"
        subtitle="Contenido para redes: copy listo para compartir con asset y campaña"
        code="MT-MKT-PUB"
        actions={!form && <button className="btn btn-primary" onClick={openForm}><Plus size={16} /> Nueva publicación</button>}
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <div className="alert alert-info">
        <Megaphone size={14} style={{ verticalAlign: '-2px' }} /> Los vendedores ven esto en su app con aviso de
        contenido nuevo.
      </div>

      {form && (
        <Card title="Publicar contenido" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
              <label>Título
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
              </label>
              <label>Red
                <select value={form.red} onChange={(e) => setForm({ ...form, red: e.target.value })}>
                  {Object.entries(REDES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
                </select>
              </label>
              <label>Campaña (opcional)
                <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
                  <option value="">Sin campaña</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label>Buscar asset del banco
                <input placeholder="Filtrar por título, categoría, SKU…" value={assetQ} onChange={(e) => setAssetQ(e.target.value)} />
              </label>
              <label>Asset vinculado (opcional)
                <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                  <option value="">Sin asset</option>
                  {filteredAssets.map((a) => (
                    <option key={a.id} value={a.id}>{a.titulo || `#${a.id}`} ({a.tipo})</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 10 }}>Copy (texto de la publicación)
              <textarea
                value={form.copyTexto}
                onChange={(e) => setForm({ ...form, copyTexto: e.target.value })}
                required
                rows={4}
                style={{ width: '100%' }}
              />
            </label>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Publicando…' : 'Publicar'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      {loading && !data ? (
        <Loading label="Cargando publicaciones…" />
      ) : feed.length === 0 && !error ? (
        <Card><Empty title="Sin publicaciones" hint="Crea la primera publicación para la fuerza de ventas." icon={Megaphone} /></Card>
      ) : (
        feed.map((p) => (
          <Card key={p.id}>
            <div className="card-body">
              <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="row wrap" style={{ gap: 8 }}>
                  <RedBadge red={p.red} />
                  <strong style={{ fontSize: 15 }}>{p.titulo || `Publicación #${p.id}`}</strong>
                  {campaignName(p.campaignId) && <Badge variant="info">{campaignName(p.campaignId)}</Badge>}
                </div>
                <span className="muted" style={{ ...fontMono, fontSize: 11 }}>{fmtTs(p.createdAt)}</span>
              </div>

              <div className="row wrap" style={{ gap: 14, alignItems: 'flex-start' }}>
                {p.assetId && (
                  <div style={{ width: 160, flexShrink: 0 }}>
                    {p.assetTipo === 'imagen' ? (
                      <AssetThumb id={p.assetId} alt={p.assetTitulo || ''} height={110} />
                    ) : (
                      <div
                        style={{
                          width: '100%', height: 110, borderRadius: 8, background: 'var(--line-2, #eeeef0)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                        }}
                      >
                        <span style={{ fontSize: 30 }}>{p.assetTipo === 'video' ? '🎬' : '📄'}</span>
                        <span className="muted" style={{ fontSize: 10, textAlign: 'center', padding: '0 6px' }}>
                          {p.assetTitulo || p.assetTipo}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 220 }}>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: 14, margin: 0 }}>{p.copyTexto || '—'}</p>
                  {p.publicadoPor && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                      Publicado por {p.publicadoPor}
                    </p>
                  )}
                </div>
              </div>

              <div className="row wrap" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn btn-sm" onClick={() => copyText(p)}>
                  {copiedId === p.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === p.id ? 'Copiado' : 'Copiar texto'}
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => remove(p)} disabled={busyId === p.id}>
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
