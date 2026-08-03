'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Administración · Auditoría — bitácora de acciones (GET /api/audit).
export default function AuditoriaPage() {
  const { data, loading, error } = useData('/api/audit?limit=200')
  const rows = asList(data)

  return (
    <div>
      <PageHeader title="Auditoría" subtitle="Bitácora de acciones del sistema" code="MT-ADM-AUD" />
      {error && <ErrorState error={error} />}
      <Card>
        {loading && !rows.length ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Sin registros de auditoría" hint="Las acciones administrativas aparecerán aquí." />
        ) : (
          <Table
            cols={['Fecha', 'Usuario', 'Acción', 'Entidad', 'Detalle']}
            rows={rows.map((r) => [
              new Date(r.ts).toLocaleString('es-MX'),
              r.userName || r.user_name || '—',
              r.action || '—',
              `${r.entity || ''} ${r.entityId || r.entity_id || ''}`.trim() || '—',
              typeof r.detail === 'object' && r.detail ? JSON.stringify(r.detail).slice(0, 60) : r.detail || '—',
            ])}
          />
        )}
      </Card>
    </div>
  )
}
