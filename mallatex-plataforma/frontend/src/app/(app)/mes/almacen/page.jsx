'use client'

import { useState } from 'react'
import { PackagePlus, PackageMinus, Scale, Layers, MapPin, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// MES · Almacén — recepción de material (MT-DT-001), egreso a producción
// (MT-DT-002), pesaje de producto terminado (MT-DT-006), rollos y ubicaciones.

const TABS = [
  { id: 'recepciones', label: 'Recepciones', icon: PackagePlus },
  { id: 'egresos', label: 'Egresos', icon: PackageMinus },
  { id: 'pesaje', label: 'Pesaje', icon: Scale },
  { id: 'rollos', label: 'Rollos', icon: Layers },
  { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
]

const ESTADO_ROLLO = { almacen: 'info', reservado: 'warn', 'en-linea': 'red' }

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const num = (v) => Number(v || 0).toLocaleString('es-MX')

// Chips de navegación entre sub-vistas (responsivo, sin desbordar en 390px).
function Tabs({ tab, setTab }) {
  return (
    <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`btn btn-sm ${tab === t.id ? 'btn-dark' : ''}`}
          onClick={() => setTab(t.id)}
        >
          <t.icon size={14} /> {t.label}
        </button>
      ))}
    </div>
  )
}

// ---- Recepciones (MT-DT-001) ---------------------------------------
function Recepciones() {
  const { data, loading, error, reload } = useData('/api/mes/recepciones')
  const rows = asList(data)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function open() {
    setForm({ proveedor: '', material: '', cantidad: '', unidad: 'kg', lote: '', incidencia: '', recibidoPor: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mes/recepciones', {
        ...form,
        cantidad: Number(form.cantidad) || 0,
        incidencia: form.incidencia || null,
      })
      setForm(null)
      setMsg({ ok: true, text: 'Recepción registrada.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Fecha', 'Proveedor', 'Material', { label: 'Cantidad', align: 'right' }, 'Lote', 'Incidencia', 'Recibió']
  const tableRows = rows.map((r) => [
    <span key="t" className="mono" style={{ fontSize: 12 }}>{fmtTs(r.ts)}</span>,
    <strong key="p">{r.proveedor || '—'}</strong>,
    r.material || '—',
    `${num(r.cantidad)} ${r.unidad || ''}`.trim(),
    r.lote ? <span key="l" className="mono" style={{ fontSize: 12 }}>{r.lote}</span> : '—',
    r.incidencia ? <Badge key="i" variant="warn">{r.incidencia}</Badge> : <Badge key="i" variant="ok">sin incidencia</Badge>,
    r.recibidoPor || r.recibido_por || '—',
  ])

  return (
    <>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Nueva recepción" code="MT-DT-001" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Proveedor
                <input value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} required />
              </label>
              <label>Material
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required />
              </label>
              <label>Cantidad
                <input type="number" step="0.01" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
              </label>
              <label>Unidad
                <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                  {['kg', 'rollos', 'piezas', 'metros', 'bultos'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label>Lote
                <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} />
              </label>
              <label>Incidencia (opcional)
                <input placeholder="Faltante, daño…" value={form.incidencia} onChange={(e) => setForm({ ...form, incidencia: e.target.value })} />
              </label>
              <label>Recibido por
                <input value={form.recibidoPor} onChange={(e) => setForm({ ...form, recibidoPor: e.target.value })} required />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar recepción'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Recepciones de material"
        code="MT-DT-001"
        actions={!form && <button className="btn btn-sm btn-primary" onClick={open}><Plus size={14} /> Nueva</button>}
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin recepciones registradas" />}
      </Card>
    </>
  )
}

// ---- Egresos (MT-DT-002) -------------------------------------------
function Egresos() {
  const { data, loading, error, reload } = useData('/api/mes/egresos')
  const orders = asList(useData('/api/mes/orders').data)
  const rows = asList(data)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const orderCode = (id) => {
    const o = orders.find((x) => String(x.id) === String(id))
    return o ? o.code || `#${o.id}` : id ? `#${id}` : '—'
  }

  function open() {
    setForm({ orderId: '', material: '', cantidad: '', unidad: 'rollos', entregadoPor: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mes/egresos', {
        ...form,
        orderId: form.orderId ? Number(form.orderId) : null,
        cantidad: Number(form.cantidad) || 0,
      })
      setForm(null)
      setMsg({ ok: true, text: 'Egreso a producción registrado.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Fecha', 'Orden', 'Material', { label: 'Cantidad', align: 'right' }, 'Entregó']
  const tableRows = rows.map((r) => [
    <span key="t" className="mono" style={{ fontSize: 12 }}>{fmtTs(r.ts)}</span>,
    <ProcessTag key="o" code={orderCode(r.orderId ?? r.order_id)} />,
    r.material || '—',
    `${num(r.cantidad)} ${r.unidad || ''}`.trim(),
    r.entregadoPor || r.entregado_por || '—',
  ])

  return (
    <>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Nuevo egreso a producción" code="MT-DT-002" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Orden de producción
                <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} required>
                  <option value="">Seleccionar…</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>{o.code || `#${o.id}`} — {o.cliente || o.client || 's/cliente'}</option>
                  ))}
                </select>
              </label>
              <label>Material
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} required />
              </label>
              <label>Cantidad
                <input type="number" step="0.01" min="0" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} required />
              </label>
              <label>Unidad
                <select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                  {['rollos', 'kg', 'piezas', 'metros'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </label>
              <label>Entregado por
                <input value={form.entregadoPor} onChange={(e) => setForm({ ...form, entregadoPor: e.target.value })} required />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar egreso'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Egresos a producción"
        code="MT-DT-002"
        actions={!form && <button className="btn btn-sm btn-primary" onClick={open}><Plus size={14} /> Nuevo</button>}
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin egresos registrados" />}
      </Card>
    </>
  )
}

// ---- Pesaje de producto terminado (MT-DT-006) ----------------------
function Pesaje() {
  const { data, loading, error, reload } = useData('/api/mes/productos-terminados')
  const orders = asList(useData('/api/mes/orders').data)
  const rows = asList(data)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const orderCode = (id) => {
    const o = orders.find((x) => String(x.id) === String(id))
    return o ? o.code || `#${o.id}` : id ? `#${id}` : '—'
  }

  function open() {
    setForm({ orderId: '', rollos: '', pesoTeorico: '', pesoReal: '', verificadoPor: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const saved = await post('/api/mes/productos-terminados', {
        orderId: form.orderId ? Number(form.orderId) : null,
        rollos: Number(form.rollos) || 0,
        pesoTeorico: Number(form.pesoTeorico) || 0,
        pesoReal: Number(form.pesoReal) || 0,
        verificadoPor: form.verificadoPor,
      })
      setForm(null)
      const dif = saved?.diferencia
      setMsg({ ok: true, text: `Pesaje registrado.${dif != null ? ` Diferencia teórico vs real: ${dif > 0 ? '+' : ''}${dif} kg.` : ''}` })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Fecha', 'Orden', { label: 'Rollos', align: 'right' }, { label: 'Teórico (kg)', align: 'right' }, { label: 'Real (kg)', align: 'right' }, { label: 'Diferencia', align: 'right' }, 'Verificó']
  const tableRows = rows.map((r) => {
    const teorico = Number(r.pesoTeorico ?? r.peso_teorico ?? 0)
    const real = Number(r.pesoReal ?? r.peso_real ?? 0)
    const diff = Number((real - teorico).toFixed(2))
    const pct = teorico ? Math.abs(diff) / teorico : (diff !== 0 ? 1 : 0)
    const variant = pct > 0.05 ? 'bad' : pct > 0.02 ? 'warn' : 'ok'
    return [
      <span key="t" className="mono" style={{ fontSize: 12 }}>{fmtTs(r.ts)}</span>,
      <ProcessTag key="o" code={orderCode(r.orderId ?? r.order_id)} />,
      num(r.rollos),
      num(teorico),
      num(real),
      <Badge key="d" variant={variant}>{diff > 0 ? '+' : ''}{diff.toLocaleString('es-MX')} kg</Badge>,
      r.verificadoPor || r.verificado_por || '—',
    ]
  })

  return (
    <>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Nuevo pesaje final" code="MT-DT-006" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Orden de producción
                <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} required>
                  <option value="">Seleccionar…</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>{o.code || `#${o.id}`} — {o.cliente || o.client || 's/cliente'}</option>
                  ))}
                </select>
              </label>
              <label>Rollos
                <input type="number" min="0" value={form.rollos} onChange={(e) => setForm({ ...form, rollos: e.target.value })} required />
              </label>
              <label>Peso teórico (kg)
                <input type="number" step="0.01" min="0" value={form.pesoTeorico} onChange={(e) => setForm({ ...form, pesoTeorico: e.target.value })} required />
              </label>
              <label>Peso real (kg)
                <input type="number" step="0.01" min="0" value={form.pesoReal} onChange={(e) => setForm({ ...form, pesoReal: e.target.value })} required />
              </label>
              <label>Verificado por
                <input value={form.verificadoPor} onChange={(e) => setForm({ ...form, verificadoPor: e.target.value })} required />
              </label>
            </div>
            {form.pesoTeorico !== '' && form.pesoReal !== '' && (
              <div style={{ ...fontMono, fontSize: 12, color: brand.gray, marginTop: 10 }}>
                Diferencia: {(Number(form.pesoReal) - Number(form.pesoTeorico)).toFixed(2)} kg
              </div>
            )}
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Registrar pesaje'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Pesaje de producto terminado (teórico vs real)"
        code="MT-DT-006"
        actions={!form && <button className="btn btn-sm btn-primary" onClick={open}><Plus size={14} /> Nuevo</button>}
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin pesajes registrados" />}
      </Card>
    </>
  )
}

// ---- Rollos (MT-DT-004) --------------------------------------------
function Rollos() {
  const { data, loading, error, reload } = useData('/api/mes/rolls')
  const rows = asList(data)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function open() {
    setForm({ code: '', material: '', medida: '', lote: '', peso: '', ubicacion: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mes/rolls', { ...form, peso: form.peso === '' ? null : Number(form.peso) })
      setForm(null)
      setMsg({ ok: true, text: 'Rollo dado de alta en almacén.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Código', 'Material', 'Medida', 'Lote', { label: 'Peso (kg)', align: 'right' }, 'Ubicación', 'Estado']
  const tableRows = rows.map((r) => [
    <ProcessTag key="c" code={r.code || `#${r.id}`} />,
    r.material || '—',
    r.medida || '—',
    r.lote ? <span key="l" className="mono" style={{ fontSize: 12 }}>{r.lote}</span> : '—',
    r.peso != null ? num(r.peso) : '—',
    r.ubicacion || '—',
    <Badge key="e" variant={ESTADO_ROLLO[r.estado] || 'muted'}>{r.estado || '—'}</Badge>,
  ])

  return (
    <>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Alta de rollo" code="MT-DT-004" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Código
                <input placeholder="RL-0001" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </label>
              <label>Material
                <input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
              </label>
              <label>Medida
                <input value={form.medida} onChange={(e) => setForm({ ...form, medida: e.target.value })} />
              </label>
              <label>Lote
                <input value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} />
              </label>
              <label>Peso (kg)
                <input type="number" step="0.01" min="0" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} />
              </label>
              <label>Ubicación
                <input placeholder="A-01" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Dar de alta'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Inventario de rollos"
        code="MT-DT-004"
        actions={!form && <button className="btn btn-sm btn-primary" onClick={open}><Plus size={14} /> Alta</button>}
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin rollos en inventario" />}
      </Card>
    </>
  )
}

// ---- Ubicaciones ---------------------------------------------------
function Ubicaciones() {
  const { data, loading, error, reload } = useData('/api/mes/locations')
  const rows = asList(data)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  function open() {
    setForm({ code: '', zona: '', descripcion: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await post('/api/mes/locations', form)
      setForm(null)
      setMsg({ ok: true, text: 'Ubicación creada.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card title="Nueva ubicación" actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}>
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Código
                <input placeholder="A-01" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </label>
              <label>Zona
                <input placeholder="Materia prima" value={form.zona} onChange={(e) => setForm({ ...form, zona: e.target.value })} />
              </label>
              <label>Descripción
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Mapa de ubicaciones de almacén"
        actions={!form && <button className="btn btn-sm btn-primary" onClick={open}><Plus size={14} /> Nueva</button>}
      >
        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Sin ubicaciones" hint="Da de alta las posiciones físicas del almacén." icon={MapPin} />
        ) : (
          <div className="card-body">
            <div className="grid grid-bento">
              {rows.map((l) => (
                <div
                  key={l.id}
                  className="card"
                  style={{ padding: 12, borderLeft: `3px solid ${l.ocupada ? brand.red : brand.ok}` }}
                >
                  <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ ...fontMono, fontWeight: 700 }}>{l.code}</span>
                    <Badge variant={l.ocupada ? 'red' : 'ok'}>{l.ocupada ? 'ocupada' : 'libre'}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: brand.gray, marginTop: 6 }}>
                    {l.zona || 'Sin zona'}
                    {l.descripcion ? ` · ${l.descripcion}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  )
}

export default function AlmacenPage() {
  const [tab, setTab] = useState('recepciones')

  return (
    <div>
      <PageHeader
        title="Almacén"
        subtitle="Recepciones, egresos a producción, pesaje final, rollos y ubicaciones"
        code="MT-PC-001/002"
      />
      <Tabs tab={tab} setTab={setTab} />
      {tab === 'recepciones' && <Recepciones />}
      {tab === 'egresos' && <Egresos />}
      {tab === 'pesaje' && <Pesaje />}
      {tab === 'rollos' && <Rollos />}
      {tab === 'ubicaciones' && <Ubicaciones />}
    </div>
  )
}
