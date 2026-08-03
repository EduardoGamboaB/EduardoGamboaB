'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// CRM · Clientes y prospectos. Consume /api/crm/clients con búsqueda local.
export default function ClientesPage() {
  const { data, loading, error } = useData('/api/crm/clients')
  const [q, setQ] = useState('')
  const rows = asList(data)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((c) =>
      [c.name, c.nombre, c.contact_name, c.cultivo, c.phone].some((v) =>
        String(v || '').toLowerCase().includes(s)
      )
    )
  }, [rows, q])

  const cols = ['Cliente', 'Tipo', 'Contacto', 'Teléfono', 'Cultivo']
  const tableRows = filtered.map((c) => {
    const type = String(c.type || c.tipo || 'cliente').toLowerCase()
    return [
      <strong key="n">{c.name || c.nombre || '—'}</strong>,
      <Badge key="t" variant={type === 'prospecto' ? 'warn' : 'ok'}>{type}</Badge>,
      c.contact_name || c.contacto || '—',
      c.phone || c.telefono || '—',
      c.cultivo || '—',
    ]
  })

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cartera comercial: clientes y prospectos"
        code="MT-CRM-001"
      />
      {error && <ErrorState error={error} />}
      <Card
        title="Cartera"
        actions={
          <div className="row" style={{ gap: 6 }}>
            <Search size={16} className="muted" />
            <input
              style={{ minHeight: 36, minWidth: 160 }}
              placeholder="Buscar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin clientes" />}
      </Card>
    </div>
  )
}
