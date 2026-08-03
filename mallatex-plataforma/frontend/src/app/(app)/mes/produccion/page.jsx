'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// MES · Jefe de producción — órdenes de producción. Consume /api/mes/orders.
const ESTADO = {
  'en-produccion': 'red', produccion: 'red',
  'cobranza-pendiente': 'warn', pendiente: 'warn',
  completo: 'ok', entregado: 'ok', liberado: 'ok',
  'en-espera': 'muted', espera: 'muted',
}

export default function ProduccionPage() {
  const { data, loading, error } = useData('/api/mes/orders')
  const rows = asList(data)

  const cols = ['Orden', 'Cliente', 'Material', 'Medida', { label: 'Rollos', align: 'right' }, 'Estado', 'Pago', 'Compromiso']
  const tableRows = rows.map((o) => {
    const st = String(o.estado || o.status || 'en-espera').toLowerCase()
    const pago = o.pago_confirmado ?? o.paid ?? false
    return [
      <ProcessTag key="c" code={o.code || o.codigo || `#${o.id}`} />,
      <strong key="cl">{o.cliente || o.client || '—'}</strong>,
      o.material || '—',
      o.medida || o.size || '—',
      Number(o.rollos || 0).toLocaleString('es-MX'),
      <Badge key="e" variant={ESTADO[st] || 'muted'}>{st}</Badge>,
      <Badge key="p" variant={pago ? 'ok' : 'bad'}>{pago ? 'confirmado' : 'pendiente'}</Badge>,
      o.compromiso || o.dueDate || '—',
    ]
  })

  return (
    <div>
      <PageHeader title="Jefe de producción" subtitle="Órdenes de producción y su estado" code="MT-PC-002" />
      {error && <ErrorState error={error} />}
      <Card title="Órdenes de producción">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin órdenes de producción" />}
      </Card>
    </div>
  )
}
