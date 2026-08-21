'use client'

import { useState } from 'react'
import { Boxes, ClipboardCheck, Plus, X, ArrowDownUp, RefreshCw, CloudUpload } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { get, post, put } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// MES · Inventario físico — artículos con saldo (kardex), conteo físico (folio
// CTF) capturado en la tablet y sincronización de ajustes con Aspel SAE.

const num = (v) => Number(v || 0).toLocaleString('es-MX', { maximumFractionDigits: 3 })
function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const ESTADO_CONTEO = { abierto: 'warn', cerrado: 'info', sincronizado: 'ok', error: 'red' }
const ESTADO_SAE = { pendiente: 'muted', enviado: 'ok', error: 'red' }

const TABS = [
  { id: 'items', label: 'Artículos', icon: Boxes },
  { id: 'counts', label: 'Conteos físicos', icon: ClipboardCheck },
]

// ============================ Artículos + kardex ============================
function ItemsTab() {
  const { data, loading, error, reload } = useData('/api/mes/inventory/items')
  const items = asList(data)
  const [form, setForm] = useState(null)
  const [mov, setMov] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function saveItem(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await post('/api/mes/inventory/items', { sku: form.sku, descripcion: form.descripcion, unidad: form.unidad, ubicacion: form.ubicacion, minimo: Number(form.minimo) || 0 })
      setForm(null); setMsg({ ok: true, text: 'Artículo dado de alta.' }); reload()
    } catch (err) { setMsg({ ok: false, text: `No se pudo guardar: ${err.message}` }) } finally { setSaving(false) }
  }

  async function saveMov(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await post('/api/mes/inventory/movements', { itemId: mov.item.id, tipo: mov.tipo, cantidad: Number(mov.cantidad), motivo: mov.motivo })
      setMov(null); setMsg({ ok: true, text: 'Movimiento registrado.' }); reload()
    } catch (err) {
      setMsg({ ok: false, text: err.status === 409 ? 'Existencia insuficiente para esa salida.' : `No se pudo registrar: ${err.message}` })
    } finally { setSaving(false) }
  }

  return (
    <div>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Nuevo artículo" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={saveItem}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>SKU (clave SAE) <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></label>
              <label>Descripción <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} required /></label>
              <label>Unidad <input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="pza, kg, m, rollo" /></label>
              <label>Ubicación <input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></label>
              <label>Mínimo <input type="number" step="0.001" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} /></label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Dar de alta'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      {mov && (
        <Card title={`Movimiento · ${mov.item.sku}`} actions={<button className="icon-btn" onClick={() => setMov(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={saveMov}>
            <p className="muted" style={{ marginTop: 0 }}>Existencia actual: <b>{num(mov.item.existencia)}</b> {mov.item.unidad}</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Tipo
                <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                  <option value="ajuste">Ajuste (+/−)</option>
                </select>
              </label>
              <label>Cantidad <input type="number" step="0.001" value={mov.cantidad} onChange={(e) => setMov({ ...mov, cantidad: e.target.value })} required /></label>
              <label>Motivo <input value={mov.motivo} onChange={(e) => setMov({ ...mov, motivo: e.target.value })} /></label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Registrando…' : 'Registrar'}</button>
              <button className="btn" type="button" onClick={() => setMov(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Artículos" actions={!form && <button className="btn btn-sm btn-primary" onClick={() => setForm({ sku: '', descripcion: '', unidad: 'pza', ubicacion: '', minimo: 0 })}><Plus size={14} /> Nuevo</button>}>
        <div className="card-body">
          {loading && !data ? <Loading /> : items.length === 0 ? (
            <Empty title="Sin artículos" hint="Da de alta los artículos (mismo SKU que en el SAE) con el botón Nuevo." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>SKU</th><th>Descripción</th><th>Unidad</th><th style={{ textAlign: 'right' }}>Existencia</th><th style={{ textAlign: 'right' }}>Mínimo</th><th>Ubicación</th><th></th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td style={{ ...fontMono, fontSize: 12 }}>{it.sku}</td>
                      <td>{it.descripcion}</td>
                      <td>{it.unidad}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: it.bajoMinimo ? brand.red : brand.ink }}>
                        {num(it.existencia)} {it.bajoMinimo && <Badge variant="red">bajo mínimo</Badge>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{num(it.minimo)}</td>
                      <td className="muted">{it.ubicacion || '—'}</td>
                      <td><button className="btn btn-sm" onClick={() => setMov({ item: it, tipo: 'entrada', cantidad: '', motivo: '' })}><ArrowDownUp size={13} /> Movimiento</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// ============================ Conteos físicos ============================
function CountsTab() {
  const { data, loading, error, reload } = useData('/api/mes/inventory/counts')
  const counts = asList(data)
  const [openId, setOpenId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function startCount() {
    const ubicacion = typeof window !== 'undefined' ? (window.prompt('Ubicación / almacén a contar:', 'Almacén PT') || '') : ''
    setBusy(true); setMsg(null)
    try { const c = await post('/api/mes/inventory/counts', { ubicacion }); setMsg({ ok: true, text: `Conteo ${c.folio} iniciado.` }); reload(); setOpenId(c.id) }
    catch (err) { setMsg({ ok: false, text: `No se pudo iniciar: ${err.message}` }) } finally { setBusy(false) }
  }

  return (
    <div>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <Card title="Conteos físicos" actions={<button className="btn btn-sm btn-primary" onClick={startCount} disabled={busy}><Plus size={14} /> Nuevo conteo</button>}>
        <div className="card-body">
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Los conteos se capturan normalmente desde la <b>tablet</b>. Aquí puedes iniciarlos, ver diferencias y <b>sincronizar los ajustes con el SAE</b>.</p>
          {loading && !data ? <Loading /> : counts.length === 0 ? (
            <Empty title="Sin conteos" hint="Inicia un conteo aquí o desde la tablet." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Folio</th><th>Ubicación</th><th>Estado</th><th>SAE</th><th>Creado</th><th></th></tr></thead>
                <tbody>
                  {counts.map((c) => (
                    <tr key={c.id}>
                      <td style={{ ...fontMono, fontSize: 12, color: brand.red }}>{c.folio}</td>
                      <td>{c.ubicacion || '—'}</td>
                      <td><Badge variant={ESTADO_CONTEO[c.estado] || 'muted'}>{c.estado}</Badge></td>
                      <td><Badge variant={ESTADO_SAE[c.saeSyncEstado] || 'muted'}>{c.saeSyncEstado}</Badge></td>
                      <td className="muted">{fmtTs(c.createdAt)}</td>
                      <td><button className="btn btn-sm" onClick={() => setOpenId(openId === c.id ? null : c.id)}>{openId === c.id ? 'Ocultar' : 'Ver'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {openId && <CountDetail id={openId} onChanged={reload} />}
    </div>
  )
}

function CountDetail({ id, onChanged }) {
  const { data, loading, error, reload } = useData(`/api/mes/inventory/counts/${id}`)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const c = data

  async function act(kind) {
    setBusy(true); setMsg(null)
    try {
      if (kind === 'close') { await post(`/api/mes/inventory/counts/${id}/close`, {}); setMsg({ ok: true, text: 'Conteo cerrado; ajustes generados.' }) }
      if (kind === 'sync') { const r = await post(`/api/mes/inventory/counts/${id}/sync`, {}); setMsg({ ok: r.saeSyncEstado === 'enviado', text: r.saeSyncEstado === 'enviado' ? `Sincronizado con el SAE (ref ${r.saeRef || '—'}).` : `SAE: ${r.saeError || 'error'}` }) }
      reload(); if (onChanged) onChanged()
    } catch (err) { setMsg({ ok: false, text: err.message }) } finally { setBusy(false) }
  }

  if (loading && !data) return <Card title="Detalle del conteo"><div className="card-body"><Loading /></div></Card>
  if (error || !c) return <Card title="Detalle del conteo"><div className="card-body"><ErrorState error={error} /></div></Card>
  const lines = c.lines || []

  return (
    <Card
      title={<span className="row wrap" style={{ gap: 8, alignItems: 'center' }}><span style={{ ...fontMono, color: brand.red }}>{c.folio}</span><Badge variant={ESTADO_CONTEO[c.estado] || 'muted'}>{c.estado}</Badge><span className="muted">{c.ubicacion}</span></span>}
      actions={
        <div className="row wrap" style={{ gap: 6 }}>
          {c.estado === 'abierto' && <button className="btn btn-sm btn-primary" onClick={() => act('close')} disabled={busy}><ClipboardCheck size={13} /> Cerrar conteo</button>}
          {(c.estado === 'cerrado' || c.estado === 'error') && <button className="btn btn-sm btn-primary" onClick={() => act('sync')} disabled={busy}><CloudUpload size={13} /> Sincronizar SAE</button>}
          <button className="btn btn-sm" onClick={reload}><RefreshCw size={13} /></button>
        </div>
      }
    >
      <div className="card-body">
        {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
        {c.saeError && <div className="alert alert-err">SAE: {c.saeError}</div>}
        <div className="row wrap" style={{ gap: 16, marginBottom: 10 }}>
          <span className="muted">Renglones: <b>{c.resumen?.contados ?? lines.length}</b></span>
          <span className="muted">Con diferencia: <b style={{ color: brand.red }}>{c.resumen?.conDiferencia ?? 0}</b></span>
          <span className="muted">Diferencia total: <b>{num(c.resumen?.difTotal ?? 0)}</b></span>
          {c.saeRef && <span className="muted">Ref SAE: <b style={fontMono}>{c.saeRef}</b></span>}
        </div>
        {lines.length === 0 ? <Empty title="Sin capturas" hint="Captura el físico desde la tablet." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>SKU</th><th style={{ textAlign: 'right' }}>Teórico</th><th style={{ textAlign: 'right' }}>Contado</th><th style={{ textAlign: 'right' }}>Diferencia</th><th>Contó</th></tr></thead>
              <tbody>
                {lines.map((l) => {
                  const dif = Number(l.diferencia)
                  return (
                    <tr key={l.id}>
                      <td style={{ ...fontMono, fontSize: 12 }}>{l.sku}</td>
                      <td style={{ textAlign: 'right' }}>{num(l.teorico)}</td>
                      <td style={{ textAlign: 'right' }}>{num(l.contado)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: dif === 0 ? brand.gray : brand.red }}>{dif > 0 ? '+' : ''}{num(l.diferencia)}</td>
                      <td className="muted">{l.contadoPor || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}

// ================================= Página =================================
export default function InventarioPage() {
  const [tab, setTab] = useState('items')
  return (
    <div>
      <PageHeader title="Inventario físico" subtitle="Saldo por artículo (kardex), conteo físico desde la tablet y sincronización de ajustes con Aspel SAE" code="MES-INV" />
      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-dark' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'items' ? <ItemsTab /> : <CountsTab />}
    </div>
  )
}
