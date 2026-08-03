'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Archive, CalendarDays } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// Marketing · Calendario de campañas. Vista mensual (grilla con barras por
// campaña) y vista anual (gantt campañas × meses), más administración de
// campañas del año (crear, editar, cerrar). CSS grid puro, sin librerías.

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const ESTADO_VARIANT = { activa: 'ok', planeada: 'info', cerrada: 'muted' }

// Parse 'YYYY-MM-DD' (o ISO) como fecha local, evitando corrimiento por TZ.
function parseDate(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function fmtDate(s) {
  const d = parseDate(s)
  if (!d) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function activeOnDay(c, date) {
  const ini = parseDate(c.fechaInicio)
  const fin = parseDate(c.fechaFin)
  if (!ini || !fin) return false
  return date >= ini && date <= fin
}

function activeInMonth(c, year, month) {
  const ini = parseDate(c.fechaInicio)
  const fin = parseDate(c.fechaFin)
  if (!ini || !fin) return false
  const mIni = new Date(year, month, 1)
  const mFin = new Date(year, month + 1, 0)
  return ini <= mFin && fin >= mIni
}

// ---- Vista mensual ---------------------------------------------------------
function MonthView({ year, month, campaigns }) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Lunes = 0 … Domingo = 6
  const offset = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const isToday = (d) =>
    d && today.getFullYear() === year && today.getMonth() === month && today.getDate() === d

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4, marginBottom: 4 }}>
        {DIAS.map((d, i) => (
          <div key={i} style={{ ...fontMono, fontSize: 10, textAlign: 'center', color: brand.gray, textTransform: 'uppercase' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} style={{ minHeight: 56 }} />
          const date = new Date(year, month, d)
          const actives = campaigns.filter((c) => activeOnDay(c, date))
          return (
            <div
              key={i}
              style={{
                minHeight: 56, border: '1px solid var(--line-2)', borderRadius: 6, padding: 3,
                background: isToday(d) ? 'var(--red-light, #fef3f3)' : '#fff', overflow: 'hidden',
              }}
            >
              <div style={{ ...fontMono, fontSize: 10, fontWeight: isToday(d) ? 800 : 500, color: isToday(d) ? brand.red : brand.gray }}>
                {d}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                {actives.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    title={`${c.nombre} (${fmtDate(c.fechaInicio)} – ${fmtDate(c.fechaFin)})`}
                    style={{ height: 5, borderRadius: 3, background: c.color || brand.red }}
                  />
                ))}
                {actives.length > 3 && (
                  <div style={{ fontSize: 9, color: brand.gray }}>+{actives.length - 3}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {campaigns.length > 0 && (
        <div className="row wrap" style={{ gap: 10, marginTop: 10 }}>
          {campaigns.map((c) => (
            <span key={c.id} className="row" style={{ gap: 5, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color || brand.red, display: 'inline-block' }} />
              {c.nombre}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Vista anual (gantt campañas × meses) ---------------------------------
function YearView({ year, campaigns }) {
  if (campaigns.length === 0) {
    return <Empty title="Sin campañas" hint={`No hay campañas registradas para ${year}.`} icon={CalendarDays} />
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 560 }}>
        <div className="grid" style={{ gridTemplateColumns: 'minmax(130px,1.6fr) repeat(12,minmax(26px,1fr))', gap: 3, marginBottom: 3 }}>
          <div />
          {MESES_CORTO.map((m) => (
            <div key={m} style={{ ...fontMono, fontSize: 9, textAlign: 'center', color: brand.gray, textTransform: 'uppercase' }}>
              {m}
            </div>
          ))}
        </div>
        {campaigns.map((c) => (
          <div
            key={c.id}
            className="grid"
            style={{ gridTemplateColumns: 'minmax(130px,1.6fr) repeat(12,minmax(26px,1fr))', gap: 3, marginBottom: 3, alignItems: 'center' }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nombre}>
              {c.nombre}
            </div>
            {MESES_CORTO.map((_, m) => {
              const on = activeInMonth(c, year, m)
              return (
                <div
                  key={m}
                  title={on ? `${c.nombre} — ${MESES[m]} ${year}` : ''}
                  style={{
                    height: 20, borderRadius: 4,
                    background: on ? (c.color || brand.red) : 'var(--line-2, #eeeef0)',
                    opacity: on ? 0.9 : 1,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Página ----------------------------------------------------------------
export default function CalendarioPage() {
  const now = new Date()
  const [view, setView] = useState('mensual')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { data, loading, error, reload } = useData(`/api/mkt/campaigns?year=${year}`)
  const campaigns = asList(data)

  const [form, setForm] = useState(null) // { id?, nombre, ... }
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)

  const monthCampaigns = useMemo(
    () => campaigns.filter((c) => activeInMonth(c, year, month)),
    [campaigns, year, month]
  )

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) } else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) } else setMonth((m) => m + 1)
  }

  function openNew() {
    setForm({ id: null, nombre: '', descripcion: '', color: '#ED3237', canal: '', fechaInicio: '', fechaFin: '', productos: '' })
    setMsg(null)
  }
  function openEdit(c) {
    setForm({
      id: c.id,
      nombre: c.nombre || '',
      descripcion: c.descripcion || '',
      color: c.color || '#ED3237',
      canal: c.canal || '',
      fechaInicio: (c.fechaInicio || '').slice(0, 10),
      fechaFin: (c.fechaFin || '').slice(0, 10),
      productos: (c.productos || []).join(', '),
    })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const body = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      color: form.color,
      canal: form.canal,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      productos: form.productos.split(',').map((s) => s.trim()).filter(Boolean),
    }
    try {
      if (form.id) await put(`/api/mkt/campaigns/${form.id}`, body)
      else await post('/api/mkt/campaigns', body)
      setForm(null)
      setMsg({ ok: true, text: form.id ? 'Campaña actualizada.' : 'Campaña creada.' })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo guardar la campaña: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  async function cerrar(c) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Cerrar la campaña "${c.nombre}"?`)) return
    setBusyId(c.id)
    setMsg(null)
    try {
      await post(`/api/mkt/campaigns/${c.id}/cerrar`, {})
      setMsg({ ok: true, text: `Campaña "${c.nombre}" cerrada.` })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: `No se pudo cerrar: ${err.message}` })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Calendario de campañas"
        subtitle="Planeación mensual y anual de campañas de marketing"
        code="MT-MKT-CAL"
      />

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <div className="row wrap" style={{ gap: 8, marginBottom: 16 }}>
        {['mensual', 'anual'].map((v) => (
          <button key={v} className={`btn btn-sm ${view === v ? 'btn-dark' : ''}`} onClick={() => setView(v)}>
            {v === 'mensual' ? 'Mensual' : 'Anual'}
          </button>
        ))}
      </div>

      <Card
        title={view === 'mensual' ? `${MESES[month]} ${year}` : `Año ${year}`}
        actions={
          <div className="row" style={{ gap: 4 }}>
            <button className="icon-btn" onClick={view === 'mensual' ? prevMonth : () => setYear((y) => y - 1)} title="Anterior">
              <ChevronLeft size={17} />
            </button>
            <button className="icon-btn" onClick={view === 'mensual' ? nextMonth : () => setYear((y) => y + 1)} title="Siguiente">
              <ChevronRight size={17} />
            </button>
          </div>
        }
      >
        <div className="card-body">
          {loading && !data ? (
            <Loading label="Cargando campañas…" />
          ) : view === 'mensual' ? (
            <MonthView year={year} month={month} campaigns={monthCampaigns} />
          ) : (
            <YearView year={year} campaigns={campaigns} />
          )}
        </div>
      </Card>

      {form && (
        <Card
          title={form.id ? 'Editar campaña' : 'Nueva campaña'}
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Nombre
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </label>
              <label>Canal
                <input placeholder="Redes, expo, impresos…" value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} />
              </label>
              <label>Color
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={{ padding: 2, height: 40 }} />
              </label>
              <label>Inicio
                <input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} required />
              </label>
              <label>Fin
                <input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} required />
              </label>
              <label>Productos (separados por coma)
                <input placeholder="sombra 35%, rafia…" value={form.productos} onChange={(e) => setForm({ ...form, productos: e.target.value })} />
              </label>
              <label>Descripción
                <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Crear campaña'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title={`Campañas ${year}`}
        actions={!form && <button className="btn btn-sm btn-primary" onClick={openNew}><Plus size={14} /> Nueva</button>}
      >
        {loading && !data ? (
          <Loading />
        ) : campaigns.length === 0 ? (
          <Empty title="Sin campañas" hint="Crea la primera campaña del año." icon={CalendarDays} />
        ) : (
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="card"
                  style={{ padding: 12, borderLeft: `4px solid ${c.color || brand.red}` }}
                >
                  <div className="row wrap" style={{ gap: 8, justifyContent: 'space-between' }}>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <strong>{c.nombre}</strong>
                      <Badge variant={ESTADO_VARIANT[c.estado] || 'muted'}>{c.estado || '—'}</Badge>
                      {c.vigente && <Badge variant="ok">vigente</Badge>}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-sm" onClick={() => openEdit(c)} disabled={busyId === c.id}>
                        <Pencil size={13} /> Editar
                      </button>
                      {c.estado !== 'cerrada' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => cerrar(c)} disabled={busyId === c.id}>
                          <Archive size={13} /> Cerrar
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {fmtDate(c.fechaInicio)} – {fmtDate(c.fechaFin)}
                    {c.canal ? ` · ${c.canal}` : ''}
                    {c.descripcion ? ` · ${c.descripcion}` : ''}
                  </div>
                  {(c.productos || []).length > 0 && (
                    <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                      {c.productos.map((p, i) => <Badge key={i} variant="muted">{p}</Badge>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
