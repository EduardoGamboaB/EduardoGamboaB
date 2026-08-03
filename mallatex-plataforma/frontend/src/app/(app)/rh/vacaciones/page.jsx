'use client'

import { Palmtree, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stat } from '@/components/ui/Stat'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Saldos de vacaciones por empleado según la LFT reformada en 2023
// ("vacaciones dignas"). Consume /api/rh/vacation-balances.
export default function VacacionesPage() {
  const { data, loading, error } = useData('/api/rh/vacation-balances')
  const rows = asList(data)

  const totalAvailable = rows.reduce((a, r) => a + (Number(r.available) || 0), 0)
  const withBalance = rows.filter((r) => (Number(r.available) || 0) > 0).length

  const cols = [
    'Empleado',
    'Ingreso',
    { label: 'Años de servicio', align: 'right' },
    { label: 'Corresponden', align: 'right' },
    { label: 'Tomados', align: 'right' },
    { label: 'Disponibles', align: 'right' },
  ]
  const tableRows = rows.map((r) => [
    <div key="e">
      <strong>{r.name || `#${r.id}`}</strong>
      <div className="muted" style={{ fontSize: 12 }}>
        {[r.code, r.department].filter(Boolean).join(' · ') || '—'}
      </div>
    </div>,
    r.hireDate || '—',
    r.years ?? 0,
    `${r.entitled ?? 0} días`,
    `${r.taken ?? 0} días`,
    <Badge key="a" variant={(r.available ?? 0) > 0 ? 'ok' : 'muted'}>{r.available ?? 0} días</Badge>,
  ])

  return (
    <div>
      <PageHeader
        title="Vacaciones"
        subtitle="Saldos de vacaciones por empleado conforme a la LFT 2023"
        code="MT-RH-VAC"
      />

      {error && <ErrorState error={error} />}
      {loading && !data ? (
        <Loading label="Cargando saldos de vacaciones…" />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Empleados" value={rows.length} icon={Users} />
            <Stat label="Días disponibles" value={totalAvailable} sub="suma de saldos vigentes" variant="ok" icon={Palmtree} />
            <Stat label="Con saldo" value={withBalance} sub="empleados con días por tomar" variant="warn" icon={Users} />
          </div>

          <Card title="Saldos por empleado" code="MT-RH-VAC">
            <Table cols={cols} rows={tableRows} empty="Sin empleados activos" />
          </Card>

          <div className="alert alert-info">
            Conforme a la reforma de &ldquo;vacaciones dignas&rdquo; (LFT, vigente desde 2023): 12 días desde el
            primer año de servicio, con incremento de 2 días por año hasta llegar a 20 en el quinto;
            a partir del sexto año se suman 2 días por cada bloque de 5 años. Los días tomados se
            descuentan del año de servicio en curso con base en incidencias de vacaciones autorizadas.
          </div>
        </>
      )}
    </div>
  )
}
