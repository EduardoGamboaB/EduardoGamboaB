'use client'

import { Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { API_BASE, getToken } from '@/lib/api'

// Periodos de nómina + enlace de exportación NOI (Aspel) por periodo.
export default function PeriodosPage() {
  const { data, loading, error } = useData('/api/periods')
  const rows = asList(data)

  function noiUrl(id) {
    const t = getToken()
    // El gateway sirve el TXT NOI; se adjunta el token para la descarga directa.
    return `${API_BASE}/api/periods/${id}/noi${t ? `?token=${encodeURIComponent(t)}` : ''}`
  }

  const cols = ['Periodo', 'Inicio', 'Fin', 'Estado', { label: 'NOI', align: 'right' }]
  const tableRows = rows.map((p) => {
    const st = String(p.status || p.estado || '').toLowerCase()
    return [
      p.name || p.nombre || `Periodo #${p.id}`,
      p.startDate || p.start_date || p.inicio || '—',
      p.endDate || p.end_date || p.fin || '—',
      <Badge key="s" variant={st === 'cerrado' ? 'muted' : 'ok'}>{st || 'abierto'}</Badge>,
      <a key="n" className="btn btn-sm" href={noiUrl(p.id)} target="_blank" rel="noreferrer">
        <Download size={14} /> Exportar
      </a>,
    ]
  })

  return (
    <div>
      <PageHeader
        title="Periodos / NOI"
        subtitle="Periodos de nómina y exportación a Aspel NOI"
        code="MT-NOI-001"
      />
      {error && <ErrorState error={error} />}
      <Card title="Periodos de nómina">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin periodos" />}
      </Card>
    </div>
  )
}
