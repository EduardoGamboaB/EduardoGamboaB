'use client'

import { useState } from 'react'
import { CheckCircle2, Lock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'

// MES · Cobranza — compuerta de liberación (release gate). Sólo las órdenes con
// pago confirmado pueden liberarse a producción. Consume /api/mes/orders.
export default function CobranzaPage() {
  const { data, loading, error, reload } = useData('/api/mes/orders')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const rows = asList(data)

  async function release(order) {
    setBusy(order.id)
    setMsg('')
    try {
      await post(`/api/mes/orders/${order.id}/release`, {})
      setMsg(`Orden ${order.code || order.id} liberada a producción.`)
      reload()
    } catch (e) {
      setMsg(`No se pudo liberar: ${e.message}`)
    } finally {
      setBusy(null)
    }
  }

  const cols = ['Orden', 'Cliente', { label: 'Rollos', align: 'right' }, 'Pago', 'Estado', { label: 'Compuerta', align: 'right' }]
  const tableRows = rows.map((o) => {
    const pago = o.pago_confirmado ?? o.paid ?? false
    const st = String(o.estado || o.status || '').toLowerCase()
    return [
      <ProcessTag key="c" code={o.code || `#${o.id}`} />,
      o.cliente || o.client || '—',
      Number(o.rollos || 0).toLocaleString('es-MX'),
      <Badge key="p" variant={pago ? 'ok' : 'bad'}>{pago ? 'confirmado' : 'pendiente'}</Badge>,
      <Badge key="e" variant={st.includes('cobranza') ? 'warn' : 'muted'}>{st || '—'}</Badge>,
      pago ? (
        <button key="b" className="btn btn-sm btn-primary" onClick={() => release(o)} disabled={busy === o.id}>
          <CheckCircle2 size={14} /> {busy === o.id ? 'Liberando…' : 'Liberar'}
        </button>
      ) : (
        <span key="l" className="badge badge-muted"><Lock size={12} /> Bloqueada</span>
      ),
    ]
  })

  return (
    <div>
      <PageHeader
        title="Cobranza"
        subtitle="Compuerta de liberación: sólo se produce con pago confirmado"
        code="MT-PC-003"
      />
      {msg && <div className="alert alert-info">{msg}</div>}
      {error && <ErrorState error={error} />}
      <Card title="Órdenes en compuerta de cobranza">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin órdenes en cobranza" />}
      </Card>
    </div>
  )
}
