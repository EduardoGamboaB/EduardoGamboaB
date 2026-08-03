'use client'

import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'

const ROLES = ['admin', 'contador', 'nomina', 'comercial', 'produccion', 'direccion']

// Configuración · Usuarios administrativos. Consume /api/users (GET/POST).
export default function UsuariosPage() {
  const { data, loading, error, reload } = useData('/api/users')
  const rows = asList(data)
  const [form, setForm] = useState(null) // null=cerrado, {}=nuevo
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function open() {
    setForm({ name: '', email: '', role: 'comercial', position: '', password: '' })
    setMsg('')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      await post('/api/users', form)
      setForm(null)
      reload()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  const cols = ['Nombre', 'Correo', 'Rol', 'Puesto', 'Estado']
  const tableRows = rows.map((u) => [
    <strong key="n">{u.name || u.nombre || '—'}</strong>,
    <span key="e" className="mono">{u.email || '—'}</span>,
    <Badge key="r" variant={u.role === 'admin' ? 'red' : 'info'}>{u.role || '—'}</Badge>,
    u.position || u.puesto || '—',
    <Badge key="a" variant={u.active === false ? 'muted' : 'ok'}>{u.active === false ? 'inactivo' : 'activo'}</Badge>,
  ])

  return (
    <div>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas administrativas de la plataforma"
        code="MT-CFG-USR"
        actions={
          <button className="btn btn-primary" onClick={open}>
            <UserPlus size={16} /> Nuevo usuario
          </button>
        }
      />
      {error && <ErrorState error={error} />}

      {form && (
        <Card
          title="Nuevo usuario"
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
              <label>Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>Correo
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </label>
              <label>Rol
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label>Puesto
                <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </label>
              <label>Contraseña
                <input type="password" placeholder="mallatex2026" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
            </div>
            {msg && <div className="alert alert-err" style={{ marginTop: 12 }}>{msg}</div>}
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Usuarios">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin usuarios" />}
      </Card>
    </div>
  )
}
