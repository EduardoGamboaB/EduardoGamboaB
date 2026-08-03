'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Stat } from '@/components/ui/Stat'
import { Card } from '@/components/ui/Card'
import { BarList } from '@/components/ui/Bars'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { Gauge, PackageCheck, AlertTriangle, TrendingUp } from 'lucide-react'

// MES · Dirección — KPIs ejecutivos de planta. Combina /api/mes/tablero y
// /api/mes/mermas para OEE aproximado, cumplimiento y merma.
export default function DireccionPage() {
  const board = useData('/api/mes/tablero')
  const mermas = useData('/api/mes/mermas')
  const loading = board.loading || mermas.loading

  const lines = asList(board.data?.lines || board.data?.lineas || board.data)
  const target = lines.reduce((a, l) => a + Number(l.target || l.rollos || 0), 0)
  const done = lines.reduce((a, l) => a + Number(l.done || l.producidos || 0), 0)
  const cumpl = target ? Math.round((done / target) * 100) : 0

  const mermaRows = asList(mermas.data)
  const mermaTotal = mermaRows.reduce((a, m) => a + Number(m.cantidad || m.amount || m.metros || 0), 0)
  const oee = Math.max(0, Math.min(100, cumpl - Math.round(mermaTotal / 100)))

  return (
    <div>
      <PageHeader title="Dirección" subtitle="Indicadores ejecutivos de planta" code="MT-PC-DIR" />
      {(board.error || mermas.error) && <ErrorState error={board.error || mermas.error} />}
      {loading ? (
        <Loading label="Calculando KPIs…" />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="OEE aprox." value={`${oee}%`} variant="red" icon={Gauge} />
            <Stat label="Cumplimiento" value={`${cumpl}%`} variant={cumpl >= 90 ? 'ok' : 'warn'} icon={PackageCheck} />
            <Stat label="Merma total" value={mermaTotal.toLocaleString('es-MX')} variant="warn" icon={AlertTriangle} />
            <Stat label="Líneas" value={lines.length} icon={TrendingUp} />
          </div>
          <Card title="Cumplimiento por línea" code="MT-PC-001">
            <div className="card-body">
              <BarList
                items={lines.map((l, i) => {
                  const t = Number(l.target || l.rollos || 0)
                  const d = Number(l.done || l.producidos || 0)
                  return { label: l.name || l.nombre || l.code || `Línea ${i + 1}`, pct: t ? (d / t) * 100 : 0 }
                })}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
