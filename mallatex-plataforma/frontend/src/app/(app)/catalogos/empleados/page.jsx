'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Catálogo · Empleados. Consume /api/employees con búsqueda local.
export default function EmpleadosPage() {
  const { data, loading, error } = useData('/api/employees')
  const [q, setQ] = useState('')
  const rows = asList(data)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((e) =>
      [e.name, e.nombre, e.code, e.department, e.position].some((v) => String(v || '').toLowerCase().includes(s))
    )
  }, [rows, q])

  const cols = ['Código', 'Nombre', 'Departamento', 'Puesto', 'Perfil', 'Estado']
  const tableRows = filtered.map((e) => [
    <ProcessTag key="c" code={e.code || e.codigo || `#${e.id}`} />,
    <strong key="n">{e.name || e.nombre || '—'}</strong>,
    e.department || e.departamento || '—',
    e.position || e.puesto || '—',
    <Badge key="p" variant="info">{e.app_profile || e.appProfile || e.profile || '—'}</Badge>,
    <Badge key="a" variant={e.active === false ? 'muted' : 'ok'}>{e.active === false ? 'inactivo' : 'activo'}</Badge>,
  ])

  return (
    <div>
      <PageHeader title="Empleados" subtitle="Padrón de colaboradores" code="MT-CAT-EMP" />
      {error && <ErrorState error={error} />}
      <Card
        title="Empleados"
        actions={
          <div className="row" style={{ gap: 6 }}>
            <Search size={16} className="muted" />
            <input style={{ minHeight: 36, minWidth: 160 }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      >
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin empleados" />}
      </Card>
    </div>
  )
}
