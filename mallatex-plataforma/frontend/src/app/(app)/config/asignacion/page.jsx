'use client'

import { useEffect, useMemo, useState } from 'react'
import { Save, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData } from '@/lib/useData'
import { put } from '@/lib/api'

// Sujetos por superficie (roles web / perfiles móviles y portal).
const SUBJECTS = {
  web: [
    { type: 'role', key: 'admin', label: 'Administrador' },
    { type: 'role', key: 'contador', label: 'Contador' },
    { type: 'role', key: 'nomina', label: 'Nómina' },
    { type: 'role', key: 'comercial', label: 'Comercial' },
    { type: 'role', key: 'produccion', label: 'Producción' },
    { type: 'role', key: 'direccion', label: 'Dirección' },
  ],
  mobile: [
    { type: 'profile', key: 'comercial', label: 'Perfil comercial' },
    { type: 'profile', key: 'operativo', label: 'Perfil operativo' },
    { type: 'profile', key: 'linea', label: 'Perfil de línea (MES)' },
  ],
  portal: [
    { type: 'profile', key: 'comercial', label: 'Perfil comercial' },
    { type: 'profile', key: 'operativo', label: 'Perfil operativo' },
    { type: 'profile', key: 'linea', label: 'Perfil de línea' },
  ],
}

// Editor de la MATRIZ DE ACCESO (rol/perfil -> módulos). Consume
// GET /api/access/matrix y guarda con PUT /api/access/grants.
export default function AsignacionPage() {
  const { data, loading, error, reload } = useData('/api/access/matrix')
  const [surface, setSurface] = useState('web')
  const [subjectKey, setSubjectKey] = useState('comercial')
  const [selected, setSelected] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const subjects = SUBJECTS[surface]
  const subject = subjects.find((s) => s.key === subjectKey) || subjects[0]

  // Catálogo de la superficie, agrupado.
  const groups = useMemo(() => {
    const cat = (data?.catalog?.[surface]) || []
    const map = new Map()
    for (const m of cat) {
      const g = m.grp || 'Otros'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(m)
    }
    return [...map.entries()].map(([grp, items]) => ({ grp, items }))
  }, [data, surface])

  // Recalcula la selección cuando cambia sujeto/superficie o llegan datos.
  // OJO: aquí NO se borra el mensaje — tras guardar se recargan los datos y
  // borrarlo aquí haría invisible la confirmación.
  useEffect(() => {
    if (!data?.grants || !subject) return
    const set = new Set(
      data.grants
        .filter((g) => g.surface === surface && g.subjectType === subject.type && g.subjectKey === subject.key)
        .map((g) => g.moduleKey)
    )
    setSelected(set)
  }, [data, surface, subject])

  // El mensaje sólo se limpia cuando el usuario cambia de sujeto/superficie.
  useEffect(() => {
    setMsg('')
  }, [surface, subjectKey])

  function toggle(key) {
    const next = new Set(selected)
    next.has(key) ? next.delete(key) : next.add(key)
    setSelected(next)
  }

  async function save() {
    if (!subject) return
    // Evita sobrescribir la matriz con un set vacío si aún no carga el catálogo.
    if (loading || !data) {
      setMsg('Espera a que cargue la matriz antes de guardar.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      await put('/api/access/grants', {
        subjectType: subject.type,
        subjectKey: subject.key,
        surface,
        moduleKeys: [...selected],
      })
      setMsg('Matriz actualizada. Los usuarios verán el cambio en su próximo inicio de sesión.')
      reload()
    } catch (e) {
      setMsg(`No se pudo guardar: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Asignación de acceso"
        subtitle="Editor de la matriz rol/perfil → módulos que dirige todos los menús"
        code="MT-CFG-ACL"
      />
      {error && <ErrorState error={error} />}

      <Card title="Selección">
        <div className="card-body">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            <label>Superficie
              <select value={surface} onChange={(e) => { setSurface(e.target.value); setSubjectKey(SUBJECTS[e.target.value][0].key) }}>
                <option value="web">Web (roles)</option>
                <option value="mobile">Móvil (perfiles)</option>
                <option value="portal">Portal empleado (perfiles)</option>
              </select>
            </label>
            <label>Sujeto
              <select value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)}>
                {subjects.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          </div>
          {subject?.key === 'admin' && surface === 'web' && (
            <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 0 }}>
              <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> El rol <b>admin</b> siempre recibe todos los módulos
              (regla de dominio); los cambios aquí no lo restringen.
            </div>
          )}
        </div>
      </Card>

      <Card
        title={`Módulos · ${subject?.label || ''}`}
        actions={
          <button className="btn btn-primary" onClick={save} disabled={saving || loading || !data}>
            <Save size={16} /> {saving ? 'Guardando…' : 'Guardar matriz'}
          </button>
        }
      >
        {loading && !data ? (
          <Loading />
        ) : (
          <div className="card-body">
            {msg && <div className="alert alert-info">{msg}</div>}
            {groups.length === 0 && <p className="muted">El catálogo de esta superficie está vacío.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {groups.map((g) => (
                <div key={g.grp}>
                  <div className="nav-group" style={{ padding: '0 0 8px' }}>{g.grp}</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                    {g.items.map((m) => {
                      const on = selected.has(m.key)
                      return (
                        <label
                          key={m.key}
                          className="row"
                          style={{
                            gap: 10, padding: '12px 14px', minHeight: 44, borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${on ? 'var(--red)' : 'var(--line)'}`,
                            background: on ? 'var(--red-light)' : '#fff',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(m.key)}
                            style={{ width: 20, height: 20, minHeight: 20, accentColor: 'var(--red)' }}
                          />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</span>
                          <span className="mono muted" style={{ marginLeft: 'auto', fontSize: 10 }}>{m.key}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
