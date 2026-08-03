'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Minus, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData } from '@/lib/useData'

// Sujetos por superficie (mismos catálogos que la pantalla de asignación).
const SUBJECTS = {
  web: [
    { type: 'role', key: 'admin', label: 'Administrador' },
    { type: 'role', key: 'contador', label: 'Contador' },
    { type: 'role', key: 'nomina', label: 'Nómina' },
    { type: 'role', key: 'comercial', label: 'Comercial' },
    { type: 'role', key: 'marketing', label: 'Marketing' },
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

const SURFACES = [
  { key: 'web', label: 'Web (roles)' },
  { key: 'mobile', label: 'Móvil (perfiles)' },
  { key: 'portal', label: 'Portal empleado' },
]

// Configuración · Permisos. Vista de SOLO LECTURA de la matriz de acceso:
// módulos (filas) × roles/perfiles (columnas). Se edita en /config/asignacion.
export default function PermisosPage() {
  const { data, loading, error } = useData('/api/access/matrix')
  const [surface, setSurface] = useState('web')

  const subjects = SUBJECTS[surface]
  const mods = useMemo(() => data?.catalog?.[surface] || [], [data, surface])

  // Set de "surface|type|key|module" para consulta O(1).
  const granted = useMemo(() => {
    const set = new Set()
    for (const g of data?.grants || []) {
      set.add(`${g.surface}|${g.subjectType}|${g.subjectKey}|${g.moduleKey}`)
    }
    return set
  }, [data])

  // Agrupa módulos por grp preservando orden.
  const groups = useMemo(() => {
    const map = new Map()
    for (const m of mods) {
      const g = m.grp || 'Otros'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(m)
    }
    return [...map.entries()].map(([grp, items]) => ({ grp, items }))
  }, [mods])

  function has(subject, moduleKey) {
    // El rol admin siempre tiene todos los módulos (regla de dominio).
    if (surface === 'web' && subject.key === 'admin') return true
    return granted.has(`${surface}|${subject.type}|${subject.key}|${moduleKey}`)
  }

  const thStyle = { padding: '10px 12px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid var(--line)' }

  return (
    <div>
      <PageHeader
        title="Permisos"
        subtitle="Matriz de acceso (solo lectura): módulos × roles/perfiles"
        code="MT-CFG-PER"
        actions={
          <Link href="/config/asignacion" className="btn btn-primary">
            <SlidersHorizontal size={16} /> Editar en Asignación
          </Link>
        }
      />
      {error && <ErrorState error={error} />}

      <div className="alert alert-info">
        <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> El rol <b>admin</b> siempre aparece con todos los
        módulos concedidos (regla de dominio). Para modificar concesiones usa{' '}
        <Link href="/config/asignacion">Asignación de acceso</Link>.
      </div>

      <Card
        title="Matriz"
        actions={
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {SURFACES.map((s) => (
              <button
                key={s.key}
                className={`btn ${surface === s.key ? 'btn-primary' : ''}`}
                onClick={() => setSurface(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        {loading && !data ? (
          <Loading />
        ) : mods.length === 0 ? (
          <Empty title="Catálogo vacío" hint="Esta superficie no tiene módulos registrados." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Módulo</th>
                  {subjects.map((s) => (
                    <th key={s.key} style={thStyle}>{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  [
                    <tr key={`g-${g.grp}`}>
                      <td colSpan={subjects.length + 1} style={{ background: 'var(--red-light, #fdf0f0)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>
                        {g.grp}
                      </td>
                    </tr>,
                    ...g.items.map((m) => (
                      <tr key={m.key}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                          <div className="mono muted" style={{ fontSize: 10 }}>{m.key}</div>
                        </td>
                        {subjects.map((s) => {
                          const on = has(s, m.key)
                          return (
                            <td key={s.key} style={{ textAlign: 'center' }}>
                              {on
                                ? <Check size={16} style={{ color: 'var(--red)' }} aria-label="concedido" />
                                : <Minus size={14} style={{ color: '#ccc' }} aria-label="sin acceso" />}
                            </td>
                          )
                        })}
                      </tr>
                    )),
                  ]
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
