'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

const KIND = {
  falta: 'bad', permiso: 'info', incapacidad: 'warn',
  vacaciones: 'ok', retardo: 'warn', justificada: 'info',
}

export default function IncidenciasPage() {
  const { data, loading, error } = useData('/api/incidents')
  const rows = asList(data)

  const cols = ['Empleado', 'Tipo', 'Desde', 'Hasta', 'Estado', 'Notas']
  const tableRows = rows.map((r) => {
    const kind = String(r.type || r.tipo || 'permiso').toLowerCase()
    return [
      r.employeeName || r.empleado || `#${r.employeeId || r.id || ''}`,
      <Badge key="k" variant={KIND[kind] || 'muted'}>{kind}</Badge>,
      r.startDate || r.desde || r.date || '—',
      r.endDate || r.hasta || '—',
      r.status || r.estado || 'pendiente',
      r.notes || r.notas || '—',
    ]
  })

  return (
    <div>
      <PageHeader title="Incidencias" subtitle="Faltas, permisos, incapacidades y justificaciones" code="MT-OP-003" />
      {error && <ErrorState error={error} />}
      <Card title="Incidencias registradas">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin incidencias" />}
      </Card>
    </div>
  )
}
