'use client'

import { useMemo, useState } from 'react'
import { Boxes, Info } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

const SURFACES = [
  { key: 'web', label: 'Web' },
  { key: 'mobile', label: 'Móvil' },
  { key: 'portal', label: 'Portal empleado' },
]

// Configuración · Módulos. Catálogo por superficie (solo lectura) con conteo
// de sujetos que tienen concedido cada módulo según la matriz de acceso.
export default function ModulosPage() {
  const [surface, setSurface] = useState('web')
  const catalogQ = useData(`/api/access/catalog?surface=${surface}`)
  const matrixQ = useData('/api/access/matrix')

  const mods = asList(catalogQ.data)

  // Sujetos con concesión por módulo en la superficie activa.
  const grantCount = useMemo(() => {
    const map = {}
    for (const g of matrixQ.data?.grants || []) {
      if (g.surface !== surface) continue
      map[g.moduleKey] = (map[g.moduleKey] || 0) + 1
    }
    return map
  }, [matrixQ.data, surface])

  // Agrupa por grp preservando el orden del catálogo.
  const groups = useMemo(() => {
    const map = new Map()
    for (const m of mods) {
      const g = m.grp || 'Otros'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(m)
    }
    return [...map.entries()].map(([grp, items]) => ({ grp, items }))
  }, [mods])

  const loading = catalogQ.loading && !catalogQ.data

  return (
    <div>
      <PageHeader
        title="Módulos"
        subtitle="Catálogo de módulos por superficie"
        code="MT-CFG-MOD"
        actions={<Boxes size={18} className="muted" />}
      />
      {catalogQ.error && <ErrorState error={catalogQ.error} />}
      {matrixQ.error && <ErrorState error={matrixQ.error} />}

      <div className="alert alert-info">
        <Info size={14} style={{ verticalAlign: '-2px' }} /> El catálogo se administra por seed/migración; las
        concesiones se editan en Asignación.
      </div>

      <Card
        title="Catálogo"
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
        {loading ? (
          <Loading />
        ) : mods.length === 0 ? (
          <Empty title="Catálogo vacío" hint="Esta superficie no tiene módulos registrados." />
        ) : (
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {groups.map((g) => (
                <div key={g.grp}>
                  <div className="nav-group" style={{ padding: '0 0 8px' }}>{g.grp}</div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                    {g.items.map((m) => {
                      const n = grantCount[m.key] || 0
                      return (
                        <div
                          key={m.key}
                          className="row"
                          style={{
                            gap: 10, padding: '12px 14px', borderRadius: 8,
                            border: '1px solid var(--line)', background: '#fff',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.label}</div>
                            <div className="mono muted" style={{ fontSize: 10 }}>{m.key}</div>
                          </div>
                          <span style={{ marginLeft: 'auto' }}>
                            <Badge variant={n ? 'ok' : 'muted'}>{n} sujeto(s)</Badge>
                          </span>
                        </div>
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
