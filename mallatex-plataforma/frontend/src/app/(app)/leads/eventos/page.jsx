'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Leads · Eventos — ferias y expos donde se capturan leads. Consume /api/events.
export default function EventosPage() {
  const { data, loading, error } = useData('/api/events')
  const rows = asList(data)

  const cols = ['Evento', 'Edición', 'Premio', 'Fecha', 'Lugar', 'Estado']
  const tableRows = rows.map((e) => [
    <strong key="n">{e.name || e.nombre || '—'}</strong>,
    e.edition || e.edicion || '—',
    e.premio || e.prize || '—',
    e.fecha || e.date || '—',
    e.lugar || e.location || '—',
    <Badge key="a" variant={e.activo ?? e.active ? 'ok' : 'muted'}>{e.activo ?? e.active ? 'activo' : 'cerrado'}</Badge>,
  ])

  return (
    <div>
      <PageHeader title="Eventos" subtitle="Ferias y expos de captura de leads" code="MT-LEAD-003" />
      {error && <ErrorState error={error} />}
      <Card title="Eventos">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin eventos" />}
      </Card>
    </div>
  )
}
