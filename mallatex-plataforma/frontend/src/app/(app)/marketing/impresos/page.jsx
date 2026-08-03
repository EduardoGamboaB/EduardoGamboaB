'use client'

import { useMemo, useState } from 'react'
import { Plus, X, Pencil, Trash2, History, Package, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put, del } from '@/lib/api'
import { brand, fontDisplay, fontMono } from '@/lib/brand'

// Marketing · Inventario de impresos (lonas, folletos, tarjetas…): existencias
// con semáforo de mínimos y kardex de movimientos (entrada/salida/ajuste).

const TIPO_MOV = {
  entrada: { label: 'Entrada', variant: 'ok' },
  salida: { label: 'Salida', variant: 'bad' },
  ajuste: { label: 'Ajuste', variant: 'warn' },
}

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const num = (v) => Number(v || 0).toLocaleString('es-MX')

// ---- Kardex de un artículo -------------------------------------------------
function Movimientos({ item, onChanged }) {
  const { data, loading, error, reload } = useData(`/api/mkt/print-items/${item.id}/movements`)
  const movs = asList(data)
  const [form, setForm] = useState({ tipo: 'salida', cantidad: '', persona: '', motivo: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mkt/print-movements', {
        itemId: item.id,
        tipo: form.tipo,
        cantidad: Number(form.cantidad) || 0,
        persona: form.persona,
        motivo: form.motivo,
      })
      setForm({ tipo: 'salida', cantidad: '', persona: '', motivo: '' })
      setMsg({ ok: true, text: 'Movimiento registrado.' })
      reload()
      onChanged?.()
    } catch (err) {
      if (err.status === 409) {
        setMsg({ ok: false, text: `Existencia insuficiente: quedan ${num(item.existencia)} ${item.unidad || 'pza'} de "${item.nombre}".` })
      } else {
        setMsg({ ok: false, text: `No se pudo registrar el movimiento: ${err.message}` })
      }
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Fecha', 'Tipo', { label: 'Cantidad', align: 'right' }, 'Persona', 'Motivo', 'Registró']
  const rows = movs.map((m) => {
    const t = TIPO_MOV[m.tipo] || { label: m.tipo || '—', variant: 'muted' }
    return [
      <span key="f" className="mono" style={{ fontSize: 12 }}>{fmtTs(m.createdAt)}</span>,
      <Badge key="t" variant={t.variant}>{t.label}</Badge>,
      <strong key="c">{m.tipo === 'salida' ? '−' : m.tipo === 'entrada' ? '+' : ''}{num(m.cantidad)}</strong>,
      m.persona || '—',
      m.motivo || '—',
      m.createdBy || '—',
    ]
  })

  return (
    <div className="card-body">
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <form onSubmit={save} style={{ marginBottom: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>
          <label>Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </label>
          <label>Cantidad
            <input type="number" min="0" step="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
          </label>
          <label>Persona
            <input placeholder="Quién recibe/entrega" value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} required />
          </label>
          <label>Motivo
            <input placeholder="Expo, visita, reposición…" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
          </label>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? 'Registrando…' : 'Registrar movimiento'}
          </button>
        </div>
      </form>

      {loading && !data ? (
        <Loading label="Cargando movimientos…" />
      ) : (
        <Table cols={cols} rows={rows} empty="Sin movimientos registrados" />
      )}
    </div>
  )
}

// ---- Página ----------------------------------------------------------------
export default function ImpresosPage() {
  const { data, loading, error, reload } = useData('/api/mkt/print-items')
  const items = asList(data)

  const [form, setForm] = useState(null) // { id?, nombre, ... }
  const [openId, setOpenId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)

  const bajoMinimo = useMemo(() => items.filter((i) => i.bajoMinimo).length, [items])
  const openItem = items.find((i) => i.id === openId) || null

  function openNew() {
    setForm({ id: null, nombre: '', categoria: '', unidad: 'pza', minimo: '', notas: '' })
    setMsg(null)
  }
  function openEdit(i) {
    setForm({ id: i.id, nombre: i.nombre || '', categoria: i.categoria || '', unidad: i.unidad || 'pza', minimo: String(i.minimo ?? ''), notas: i.notas || '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const body = {
      nombre: form.nombre,
      categoria: form.categoria,
      unidad: form.unidad,
      minimo: Number(form.minimo) || 0,
      notas: form.notas,
    }
    try {
      if (form.id) await put(`/api/mkt/print-items/${form.id}`, body)
      else await post('/api/mkt/print-items', body)
      setForm(null)
      setMsg({ ok: true, text: form.id ? 'Artículo actualizado.' : 'Artículo dado de alta.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo guardar: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function remove(i) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar el artículo "${i.nombre}"?`)) return
    setBusyId(i.id)
    setMsg(null)
    try {
      await del(`/api/mkt/print-items/${i.id}`)
      if (openId === i.id) setOpenId(null)
      setMsg({ ok: true, text: 'Artículo eliminado.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo eliminar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  const cols = ['Artículo', 'Categoría', { label: 'Existencia', align: 'right' }, { label: 'Mínimo', align: 'right' }, 'Estado', 'Acciones']
  const rows = items.map((i) => [
    <div key="n">
      <strong>{i.nombre}</strong>
      {i.notas && <div className="muted" style={{ fontSize: 11 }}>{i.notas}</div>}
    </div>,
    <Badge key="c" variant="info">{i.categoria || 'otros'}</Badge>,
    <span key="e" style={{ ...fontDisplay, fontWeight: 900, fontSize: 22, color: i.bajoMinimo ? brand.bad : brand.ink }}>
      {num(i.existencia)} <span style={{ ...fontMono, fontSize: 10, color: brand.gray, fontWeight: 500 }}>{i.unidad || 'pza'}</span>
    </span>,
    <span key="m" className="mono" style={{ fontSize: 12 }}>{num(i.minimo)}</span>,
    i.bajoMinimo
      ? <Badge key="s" variant="bad">🔴 bajo mínimo</Badge>
      : <Badge key="s" variant="ok">🟢 ok</Badge>,
    <div key="a" className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
      <button
        className={`btn btn-sm ${openId === i.id ? 'btn-dark' : ''}`}
        onClick={() => setOpenId((cur) => (cur === i.id ? null : i.id))}
        title="Movimientos"
      >
        <History size={13} />
      </button>
      <button className="btn btn-sm" onClick={() => openEdit(i)} title="Editar"><Pencil size={13} /></button>
      <button className="btn btn-sm btn-ghost" onClick={() => remove(i)} disabled={busyId === i.id} title="Eliminar">
        <Trash2 size={13} />
      </button>
    </div>,
  ])

  return (
    <div>
      <PageHeader
        title="Inventario de impresos"
        subtitle="Lonas, folletos, tarjetas y material promocional con control de mínimos"
        code="MT-MKT-IMP"
        actions={!form && <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nuevo artículo</button>}
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Artículos" value={num(items.length)} icon={Package} />
        <Stat
          label="Bajo mínimo"
          value={num(bajoMinimo)}
          variant={bajoMinimo ? 'bad' : 'ok'}
          icon={AlertTriangle}
          sub={bajoMinimo ? 'Requieren reposición' : 'Inventario sano'}
        />
      </div>

      {form && (
        <Card
          title={form.id ? 'Editar artículo' : 'Nuevo artículo'}
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Nombre
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </label>
              <label>Categoría
                <input placeholder="lonas, folletos, tarjetas…" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
              </label>
              <label>Unidad
                <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                  {['pza', 'paquete', 'caja', 'rollo', 'millar'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label>Mínimo
                <input type="number" min="0" step="1" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} required />
              </label>
              <label>Notas
                <input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Dar de alta'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Artículos">
        {loading && !data ? (
          <Loading label="Cargando inventario…" />
        ) : items.length === 0 && !error ? (
          <Empty title="Sin artículos" hint="Da de alta el material impreso a controlar." icon={Package} />
        ) : (
          <Table cols={cols} rows={rows} empty="Sin artículos" />
        )}
      </Card>

      {openItem && (
        <Card
          title={`Movimientos · ${openItem.nombre}`}
          actions={<button className="icon-btn" onClick={() => setOpenId(null)}><X size={18} /></button>}
        >
          <Movimientos item={openItem} onChanged={reload} />
        </Card>
      )}
    </div>
  )
}
