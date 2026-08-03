'use client'

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`

// Catálogo de productos (mallas). Consume /api/products.
export default function ProductosPage() {
  const { data, loading, error } = useData('/api/products')
  const rows = asList(data)

  const cols = ['SKU', 'Producto', 'Categoría', 'Unidad', { label: 'Precio', align: 'right' }, { label: 'Stock', align: 'right' }]
  const tableRows = rows.map((p) => {
    const stock = Number(p.stock || 0)
    return [
      <ProcessTag key="s" code={p.sku || p.code || '—'} />,
      <strong key="n">{p.name || p.nombre || '—'}</strong>,
      p.category || p.categoria || '—',
      p.unit || p.unidad || '—',
      money(p.price || p.precio),
      <Badge key="st" variant={stock > 0 ? 'ok' : 'bad'}>{stock.toLocaleString('es-MX')}</Badge>,
    ]
  })

  return (
    <div>
      <PageHeader title="Productos" subtitle="Catálogo de mallas y materiales" code="MT-CAT-PROD" />
      {error && <ErrorState error={error} />}
      <Card title="Catálogo">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin productos" />}
      </Card>
    </div>
  )
}
