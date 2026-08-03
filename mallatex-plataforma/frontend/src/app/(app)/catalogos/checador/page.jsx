'use client'

import { useState } from 'react'
import { Fingerprint, Plus, Pencil, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put, del } from '@/lib/api'

// Catálogos · Checador — dispositivos biométricos de asistencia (MT-CAT-DEV).
// CRUD sobre /api/devices del servicio attendance.

const EMPTY_FORM = { name: '', brand: '', model: '', serial: '', ip: '', location: '', active: true }

function fmtSync(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ChecadorPage() {
  const { data, loading, error, reload } = useData('/api/devices')
  const rows = asList(data)
  const [form, setForm] = useState(null) // null=cerrado, sin id=nuevo, con id=edición
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setMsg(null)
  }

  function openEdit(d) {
    setForm({
      id: d.id,
      name: d.name || '',
      brand: d.brand || '',
      model: d.model || '',
      serial: d.serial || '',
      ip: d.ip || '',
      location: d.location || '',
      active: d.active !== false,
    })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      if (form.id) {
        await put(`/api/devices/${form.id}`, form)
        setMsg({ ok: true, text: `Dispositivo "${form.name}" actualizado.` })
      } else {
        await post('/api/devices', form)
        setMsg({ ok: true, text: `Dispositivo "${form.name}" dado de alta.` })
      }
      setForm(null)
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function remove(d) {
    if (typeof window !== 'undefined' && !window.confirm(`¿Desactivar el checador "${d.name}"? Dejará de descargar checadas.`)) return
    setBusy(d.id)
    setMsg(null)
    try {
      await del(`/api/devices/${d.id}`)
      setMsg({ ok: true, text: `Dispositivo "${d.name}" eliminado del catálogo.` })
      reload()
    } catch (err) {
      setMsg({ ok: false, text: err.message })
    } finally {
      setBusy(null)
    }
  }

  const cols = ['Nombre', 'Marca / modelo', 'Serie', 'IP', 'Ubicación', 'Última sync', 'Estado', { label: 'Acciones', align: 'right' }]
  const tableRows = rows.map((d) => [
    <strong key="n">{d.name || '—'}</strong>,
    [d.brand, d.model].filter(Boolean).join(' · ') || '—',
    d.serial ? <span key="s" className="mono" style={{ fontSize: 12 }}>{d.serial}</span> : '—',
    d.ip ? <span key="i" className="mono" style={{ fontSize: 12 }}>{d.ip}</span> : '—',
    d.location || '—',
    <span key="y" className="mono" style={{ fontSize: 12 }}>{fmtSync(d.lastSync || d.last_sync)}</span>,
    <Badge key="a" variant={d.active === false ? 'muted' : 'ok'}>{d.active === false ? 'inactivo' : 'activo'}</Badge>,
    <div key="x" className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      <button className="icon-btn" title="Editar" onClick={() => openEdit(d)}><Pencil size={16} /></button>
      <button className="icon-btn" title="Desactivar" onClick={() => remove(d)} disabled={busy === d.id}>
        <Trash2 size={16} />
      </button>
    </div>,
  ])

  return (
    <div>
      <PageHeader
        title="Checador"
        subtitle="Dispositivos biométricos de asistencia"
        code="MT-CAT-DEV"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo dispositivo
          </button>
        }
      />

      <div className="alert alert-info">
        La descarga de checadas Hikvision se conecta vía ISAPI en producción (hoy simulada).
      </div>

      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {form && (
        <Card
          title={form.id ? `Editar dispositivo #${form.id}` : 'Nuevo dispositivo'}
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
              <label>Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>Marca
                <input placeholder="Hikvision" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </label>
              <label>Modelo
                <input placeholder="DS-K1T343MFWX" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </label>
              <label>No. de serie
                <input value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} />
              </label>
              <label>Dirección IP
                <input placeholder="192.168.1.201" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} />
              </label>
              <label>Ubicación
                <input placeholder="Entrada planta" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </label>
              <label>Estado
                <select value={form.active ? 'activo' : 'inactivo'} onChange={(e) => setForm({ ...form, active: e.target.value === 'activo' })}>
                  <option value="activo">activo</option>
                  <option value="inactivo">inactivo</option>
                </select>
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

      <Card title="Dispositivos registrados">
        {loading && !data ? (
          <Loading label="Cargando dispositivos…" />
        ) : rows.length === 0 ? (
          <Empty title="Sin checadores" hint="Da de alta los dispositivos biométricos de la planta." icon={Fingerprint} />
        ) : (
          <Table cols={cols} rows={tableRows} empty="Sin dispositivos" />
        )}
      </Card>
    </div>
  )
}
