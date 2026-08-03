'use client'

import { useState } from 'react'
import { Plus, Pencil, MapPinOff, X, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put, del } from '@/lib/api'

const EMPTY_FORM = { name: '', client: '', lat: '', lng: '', radiusMeters: 150 }

// Catálogo · Sitios / geocercas. Consume /api/sites (GET/POST/PUT/DELETE soft).
export default function SitiosPage() {
  const { data, loading, error, reload } = useData('/api/sites')
  const rows = asList(data)
  const [form, setForm] = useState(null) // null=cerrado, sin id=alta, con id=edición
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('')
  const [formMsg, setFormMsg] = useState('')

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setFormMsg('')
    setMsg('')
  }

  function openEdit(s) {
    setForm({
      id: s.id,
      name: s.name || '',
      client: s.client || '',
      lat: s.lat ?? '',
      lng: s.lng ?? '',
      radiusMeters: s.radiusMeters ?? 150,
    })
    setFormMsg('')
    setMsg('')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormMsg('')
    try {
      const body = {
        name: form.name,
        client: form.client,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radiusMeters: Number(form.radiusMeters) || 150,
      }
      if (form.id) {
        await put(`/api/sites/${form.id}`, body)
        setMsg('Sitio actualizado.')
      } else {
        await post('/api/sites', body)
        setMsg('Sitio creado.')
      }
      setForm(null)
      reload()
    } catch (err) {
      setFormMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(s) {
    if (!window.confirm(`¿Desactivar el sitio "${s.name}"? Las checadas de campo dejarán de validarse contra esta geocerca.`)) return
    setBusyId(s.id)
    setMsg('')
    try {
      await del(`/api/sites/${s.id}`)
      setMsg('Sitio desactivado.')
      reload()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const cols = ['Sitio', 'Cliente', 'Latitud', 'Longitud', 'Radio', 'Estado', '']
  const tableRows = rows.map((s) => [
    <strong key="n">{s.name || '—'}</strong>,
    s.client || '—',
    <span key="la" className="mono">{s.lat != null ? Number(s.lat).toFixed(6) : '—'}</span>,
    <span key="lo" className="mono">{s.lng != null ? Number(s.lng).toFixed(6) : '—'}</span>,
    <Badge key="r" variant="info">{s.radiusMeters ?? '—'} m</Badge>,
    <Badge key="a" variant={s.active === false ? 'muted' : 'ok'}>{s.active === false ? 'inactivo' : 'activo'}</Badge>,
    <div key="ac" className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      <button className="icon-btn" title="Editar" onClick={() => openEdit(s)}><Pencil size={16} /></button>
      {s.active !== false && (
        <button className="icon-btn" title="Desactivar" disabled={busyId === s.id} onClick={() => deactivate(s)}>
          <MapPinOff size={16} />
        </button>
      )}
    </div>,
  ])

  return (
    <div>
      <PageHeader
        title="Sitios y geocercas"
        subtitle="Ubicaciones de obra y radios de geocerca"
        code="MT-CAT-SIT"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo sitio
          </button>
        }
      />
      {error && <ErrorState error={error} />}
      {msg && <div className="alert alert-info">{msg}</div>}

      <div className="alert alert-info">
        <MapPin size={14} style={{ verticalAlign: '-2px' }} /> Las checadas de campo se validan contra estas geocercas.
      </div>

      {form && (
        <Card
          title={form.id ? 'Editar sitio' : 'Nuevo sitio'}
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
              <label>Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>Cliente
                <input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
              </label>
              <label>Latitud
                <input type="number" step="any" min="-90" max="90" placeholder="25.686600" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
              </label>
              <label>Longitud
                <input type="number" step="any" min="-180" max="180" placeholder="-100.316100" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
              </label>
              <label>Radio de geocerca (m)
                <input type="number" min="10" step="10" value={form.radiusMeters} onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })} required />
              </label>
            </div>
            {formMsg && <div className="alert alert-err" style={{ marginTop: 12 }}>{formMsg}</div>}
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Sitios">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin sitios registrados" />}
      </Card>
    </div>
  )
}
