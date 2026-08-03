'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Stat } from '@/components/ui/Stat'
import { BarList } from '@/components/ui/Bars'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { Target } from 'lucide-react'

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX')}`

// CRM · Objetivos de venta y avance vs meta. Consume /api/crm/objectives.
export default function ObjetivosPage() {
  const { data, loading, error } = useData('/api/crm/objectives')
  const rows = asList(data)

  const totalTarget = rows.reduce((a, r) => a + Number(r.target_amount || r.meta || 0), 0)
  const totalAchieved = rows.reduce((a, r) => a + Number(r.achieved_amount || r.logrado || 0), 0)
  const pct = totalTarget ? Math.round((totalAchieved / totalTarget) * 100) : 0

  const bars = rows.map((r) => {
    const target = Number(r.target_amount || r.meta || 0)
    const achieved = Number(r.achieved_amount || r.logrado || 0)
    return {
      label: `${r.period || r.periodo || 'Periodo'} · ${r.employeeName || r.vendedor || `#${r.employee_id || ''}`}`,
      pct: target ? (achieved / target) * 100 : 0,
      value: `${money(achieved)} / ${money(target)}`,
    }
  })

  return (
    <div>
      <PageHeader title="Objetivos" subtitle="Metas de venta y cumplimiento por vendedor" code="MT-CRM-002" />
      {error && <ErrorState error={error} />}
      {loading && !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Meta total" value={money(totalTarget)} icon={Target} />
            <Stat label="Logrado" value={money(totalAchieved)} variant="ok" />
            <Stat label="Cumplimiento" value={`${pct}%`} variant={pct >= 100 ? 'ok' : 'warn'} />
          </div>
          <Card title="Avance por objetivo" code="MT-CRM-002">
            <div className="card-body">
              {bars.length ? <BarList items={bars} /> : <Empty title="Sin objetivos registrados" />}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
