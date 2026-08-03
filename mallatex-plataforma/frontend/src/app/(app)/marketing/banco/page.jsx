'use client'

import { useMemo, useState } from 'react'
import { Search, Plus, X, Download, Trash2, CloudUpload, Film, FileText, Link2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { AssetThumb, downloadAsset } from '@/components/AssetThumb'
import { useData, asList } from '@/lib/useData'
import { post, del } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// Marketing · Banco de contenido (imágenes, videos y documentos) con filtros,
// carga de archivos (dataURL) o liga externa y panel de sincronización a S3.

const TIPOS = [
  { id: '', label: 'Todos' },
  { id: 'imagen', label: 'Imágenes' },
  { id: 'video', label: 'Videos' },
  { id: 'documento', label: 'Documentos' },
]
const CATEGORIAS = ['sombra', 'antigranizo', 'antiinsecto', 'cubresuelo', 'rafia', 'corporativo', 'otro']
const VIDEO_AVISO_BYTES = 25 * 1024 * 1024

function fmtSize(bytes) {
  const n = Number(bytes || 0)
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Tile no-imagen (video/documento) con emoji grande.
function TypeTile({ emoji, label }) {
  return (
    <div
      style={{
        width: '100%', height: 120, borderRadius: 8, background: 'var(--line-2, #eeeef0)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}
    >
      <span style={{ fontSize: 34 }}>{emoji}</span>
      <span className="muted" style={{ fontSize: 11 }}>{label}</span>
    </div>
  )
}

function extFromMime(mime) {
  const m = String(mime || '')
  if (m.includes('jpeg')) return '.jpg'
  if (m.includes('png')) return '.png'
  if (m.includes('webp')) return '.webp'
  if (m.includes('gif')) return '.gif'
  if (m.includes('pdf')) return '.pdf'
  if (m.includes('mp4')) return '.mp4'
  return ''
}

export default function BancoPage() {
  const [tipo, setTipo] = useState('')
  const [categoria, setCategoria] = useState('')
  const [q, setQ] = useState('')

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (tipo) p.set('tipo', tipo)
    if (categoria) p.set('categoria', categoria)
    if (q.trim()) p.set('q', q.trim())
    const s = p.toString()
    return s ? `?${s}` : ''
  }, [tipo, categoria, q])

  const { data, loading, error, reload } = useData(`/api/mkt/assets${qs}`)
  const s3Q = useData('/api/mkt/assets/s3-status')
  const campaignsQ = useData('/api/mkt/campaigns')
  const assets = asList(data)
  const campaigns = asList(campaignsQ.data)
  const s3 = s3Q.data

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null) // { ok, text }

  function openForm() {
    setForm({
      tipo: 'imagen', titulo: '', descripcion: '', categoria: 'otro', productSku: '',
      campaignId: '', externalUrl: '', file: null, fileName: '', fileSize: 0,
    })
    setMsg(null)
  }

  function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) {
      setForm({ ...form, file: null, fileName: '', fileSize: 0 })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setForm((cur) => ({ ...cur, file: reader.result, fileName: f.name, fileSize: f.size }))
    reader.readAsDataURL(f)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.file && !form.externalUrl.trim()) {
      setMsg({ ok: false, text: 'Adjunta un archivo o captura una liga externa.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mkt/assets', {
        tipo: form.tipo,
        titulo: form.titulo,
        descripcion: form.descripcion,
        categoria: form.categoria,
        productSku: form.productSku || null,
        campaignId: form.campaignId ? Number(form.campaignId) : null,
        externalUrl: form.externalUrl.trim() || undefined,
        file: form.file || undefined,
      })
      setForm(null)
      setMsg({ ok: true, text: 'Contenido agregado al banco.' })
      reload()
      s3Q.reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo guardar: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function remove(a) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar "${a.titulo}" del banco?`)) return
    setBusyId(a.id)
    setMsg(null)
    try {
      await del(`/api/mkt/assets/${a.id}`)
      setMsg({ ok: true, text: 'Contenido eliminado.' })
      reload()
      s3Q.reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo eliminar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  async function download(a) {
    setBusyId(a.id)
    setMsg(null)
    try {
      if (!a.hasFile && a.externalUrl) {
        window.open(a.externalUrl, '_blank', 'noopener')
      } else {
        await downloadAsset(a.id, `${a.titulo || `asset-${a.id}`}${extFromMime(a.mime)}`)
      }
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo descargar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  async function syncS3() {
    setSyncing(true)
    setMsg(null)
    try {
      const res = await post('/api/mkt/assets/sync-s3', {})
      const failed = res?.failed?.length || 0
      setMsg({
        ok: failed === 0,
        text: `Sincronización a S3: ${res?.migrated ?? 0} archivo(s) migrado(s)${failed ? `, ${failed} con error` : ''}.`,
      })
      reload()
      s3Q.reload()
    } catch (err) {
      if (err.status === 409) {
        setMsg({ ok: false, text: 'S3 sin configurar. Configura las variables S3_* y reinicia el servicio.' })
      } else {
        setMsg({ ok: false, text: `No se pudo sincronizar: ${err.message}` })
      }
    } finally {
      setSyncing(false)
    }
  }

  const campaignName = (id) => {
    const c = campaigns.find((x) => String(x.id) === String(id))
    return c ? c.nombre : null
  }

  const videoWarn = form && form.tipo === 'video' && form.fileSize > VIDEO_AVISO_BYTES

  return (
    <div>
      <PageHeader
        title="Banco de contenido"
        subtitle="Imágenes, videos y documentos de marketing para toda la fuerza comercial"
        code="MT-MKT-BAN"
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {/* Panel S3 */}
      <Card title="Almacenamiento S3" actions={<CloudUpload size={16} className="muted" />}>
        <div className="card-body">
          {s3Q.loading && !s3 ? (
            <Loading />
          ) : s3Q.error ? (
            <p className="muted" style={{ margin: 0 }}>Estado de S3 no disponible.</p>
          ) : (
            <div className="row wrap" style={{ gap: 10, alignItems: 'center' }}>
              {s3?.configured ? (
                <Badge variant="ok">S3 configurado: bucket {s3.bucket || '—'}</Badge>
              ) : (
                <Badge variant="warn">S3 sin configurar — {s3?.pendingCount ?? 0} video(s) en espera</Badge>
              )}
              {(s3?.pendingCount ?? 0) > 0 && (
                <Badge variant="info">{s3.pendingCount} archivo(s) pendiente(s) de sincronizar</Badge>
              )}
              <button className="btn btn-sm" onClick={syncS3} disabled={syncing}>
                <CloudUpload size={14} /> {syncing ? 'Sincronizando…' : 'Sincronizar a S3'}
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Alta de contenido */}
      {form && (
        <Card title="Nuevo contenido" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
              <label>Tipo
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  <option value="imagen">Imagen</option>
                  <option value="video">Video</option>
                  <option value="documento">Documento</option>
                </select>
              </label>
              <label>Título
                <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
              </label>
              <label>Categoría
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label>SKU de producto (opcional)
                <input value={form.productSku} onChange={(e) => setForm({ ...form, productSku: e.target.value })} />
              </label>
              <label>Campaña (opcional)
                <select value={form.campaignId} onChange={(e) => setForm({ ...form, campaignId: e.target.value })}>
                  <option value="">Sin campaña</option>
                  {campaigns.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </label>
              <label>Descripción
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </label>
              <label>Archivo
                <input type="file" onChange={onFile} />
              </label>
              <label>… o liga externa (YouTube, Drive, etc.)
                <input
                  type="url"
                  placeholder="https://…"
                  value={form.externalUrl}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                />
              </label>
            </div>
            {form.fileName && (
              <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                Archivo: {form.fileName} ({fmtSize(form.fileSize)})
              </p>
            )}
            {videoWarn && (
              <div className="alert alert-err" style={{ marginTop: 10, marginBottom: 0 }}>
                El video supera los 25 MB. Se recomienda subirlo a una liga externa o esperar a la
                sincronización con S3 para no saturar la base de datos.
              </div>
            )}
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Agregar al banco'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      {/* Galería */}
      <Card
        title="Galería"
        actions={
          <div className="row wrap" style={{ gap: 6 }}>
            <Search size={16} className="muted" />
            <input
              style={{ minHeight: 36, minWidth: 140 }}
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {!form && (
              <button className="btn btn-sm btn-primary" onClick={openForm}><Plus size={14} /> Nuevo</button>
            )}
          </div>
        }
      >
        <div className="card-body">
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            {TIPOS.map((t) => (
              <button
                key={t.id}
                className={`btn btn-sm ${tipo === t.id ? 'btn-dark' : ''}`}
                onClick={() => setTipo(t.id)}
              >
                {t.label}
              </button>
            ))}
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ minHeight: 36 }}>
              <option value="">Todas las categorías</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading && !data ? (
            <Loading label="Cargando banco…" />
          ) : assets.length === 0 ? (
            <Empty title="Sin contenido" hint="Agrega imágenes, videos o documentos con el botón Nuevo." />
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {assets.map((a) => (
                <div key={a.id} className="card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {a.tipo === 'imagen' ? (
                    (a.hasFile || a.externalUrl) ? <AssetThumb id={a.id} alt={a.titulo} /> : <TypeTile emoji="🖼️" label="Sin archivo" />
                  ) : a.tipo === 'video' ? (
                    <div style={{ position: 'relative' }}>
                      <TypeTile emoji="🎬" label="Video" />
                      {a.pendingSync && (
                        <span style={{ position: 'absolute', top: 6, right: 6 }}>
                          <Badge variant="warn">pendiente S3</Badge>
                        </span>
                      )}
                    </div>
                  ) : (
                    <TypeTile emoji="📄" label="Documento" />
                  )}

                  <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25, overflowWrap: 'anywhere' }}>
                    {a.titulo || `Asset #${a.id}`}
                  </div>
                  <div className="row wrap" style={{ gap: 6 }}>
                    <Badge variant="info">{a.categoria || 'otro'}</Badge>
                    {campaignName(a.campaignId) && <Badge variant="muted">{campaignName(a.campaignId)}</Badge>}
                    {a.externalUrl && !a.hasFile && <Badge variant="muted"><Link2 size={10} /> liga</Badge>}
                  </div>
                  <div style={{ ...fontMono, fontSize: 10, color: brand.gray }}>
                    {fmtDate(a.createdAt)}{a.sizeBytes ? ` · ${fmtSize(a.sizeBytes)}` : ''}
                  </div>
                  <div className="row wrap" style={{ gap: 6, marginTop: 'auto' }}>
                    <button className="btn btn-sm" onClick={() => download(a)} disabled={busyId === a.id}>
                      <Download size={13} /> Descargar
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => remove(a)} disabled={busyId === a.id} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <p className="muted" style={{ fontSize: 12 }}>
        <Film size={12} style={{ verticalAlign: '-2px' }} /> Los videos se guardan temporalmente en la base de
        datos y se migran a S3 al sincronizar. <FileText size={12} style={{ verticalAlign: '-2px' }} /> Documentos
        e imágenes quedan disponibles para descarga de vendedores.
      </p>
    </div>
  )
}
