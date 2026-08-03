'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Stat } from '@/components/ui/Stat'
import { Bar } from '@/components/ui/Bars'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { brand, fontDisplay, fontMono } from '@/lib/brand'
import { Factory, Layers, Gauge } from 'lucide-react'

// MES · Tablero de producción. Progreso por línea con feel "bento" y ProcessTag.
// Consume /api/mes/tablero (o /api/mes/lines como respaldo).
export default function TableroPage() {
  const { data, loading, error } = useData('/api/mes/tablero')
  const board = data || {}
  const lines = asList(board.lines || board.lineas || data)

  const totalRollos = lines.reduce((a, l) => a + Number(l.target || l.rollos || l.meta || 0), 0)
  const doneRollos = lines.reduce((a, l) => a + Number(l.done || l.producidos || l.avance || 0), 0)
  const pct = totalRollos ? Math.round((doneRollos / totalRollos) * 100) : 0
  const activeLines = lines.filter((l) => Number(l.done || l.producidos || 0) > 0).length

  return (
    <div>
      <PageHeader
        title="Tablero de producción"
        subtitle="Avance en tiempo real por línea de producción"
        code="MT-PC-001"
      />
      {error && <ErrorState error={error} />}

      {loading && !data ? (
        <Loading label="Cargando tablero…" />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Avance global" value={`${pct}%`} variant="red" icon={Gauge} />
            <Stat label="Rollos producidos" value={doneRollos.toLocaleString('es-MX')} sub={`de ${totalRollos.toLocaleString('es-MX')}`} icon={Layers} />
            <Stat label="Líneas activas" value={`${activeLines}/${lines.length}`} variant="ok" icon={Factory} />
          </div>

          {lines.length === 0 ? (
            <Card><Empty title="Sin datos de tablero" hint="El servicio MES no devolvió líneas activas." /></Card>
          ) : (
            <div className="grid grid-bento">
              {lines.map((l, i) => {
                const target = Number(l.target || l.rollos || l.meta || 0)
                const done = Number(l.done || l.producidos || l.avance || 0)
                const p = target ? Math.round((done / target) * 100) : 0
                const state = String(l.status || l.estado || (p >= 100 ? 'completo' : done > 0 ? 'en-produccion' : 'en-espera'))
                return (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ ...fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase' }}>
                        {l.name || l.nombre || l.code || `Línea ${i + 1}`}
                      </span>
                      <ProcessTag code={l.code || `LC${i + 1}`} />
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <Badge variant={p >= 100 ? 'ok' : done > 0 ? 'red' : 'muted'}>{state}</Badge>
                      <span style={{ ...fontMono, fontSize: 12, color: brand.gray }}>{done}/{target}</span>
                    </div>
                    <Bar pct={p} />
                    <div style={{ ...fontMono, fontSize: 10, color: '#999', marginTop: 6, textAlign: 'right' }}>{p}%</div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
