'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'

// Asistencia: tabla de checadas/registros + acción de reprocesar periodo.
const STATUS = {
  presente: 'ok', asistencia: 'ok', ok: 'ok',
  retardo: 'warn', tarde: 'warn',
  falta: 'bad', ausente: 'bad',
  justificada: 'info', permiso: 'info',
}

export default function AsistenciaPage() {
  const { data, loading, error, reload } = useData('/api/attendance')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const rows = asList(data)

  async function reprocess() {
    setBusy(true)
    setMsg('')
    try {
      await post('/api/attendance/reprocess', {})
      setMsg('Reproceso solicitado correctamente.')
      reload()
    } catch (e) {
      setMsg(`No se pudo reprocesar: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  const cols = ['Empleado', 'Fecha', 'Entrada', 'Salida', 'Estado', { label: 'Horas', align: 'right' }]
  const tableRows = rows.map((r) => {
    const st = String(r.status || r.estado || 'presente').toLowerCase()
    return [
      r.employeeName || r.empleado || r.name || `#${r.employeeId || r.id || ''}`,
      r.date || r.fecha || '—',
      r.checkIn || r.entrada || '—',
      r.checkOut || r.salida || '—',
      <Badge key="s" variant={STATUS[st] || 'muted'}>{st}</Badge>,
      r.hours ?? r.horas ?? '—',
    ]
  })

  return (
    <div>
      <PageHeader
        title="Asistencia"
        subtitle="Registros de entrada/salida y reproceso de nómina"
        code="MT-OP-002"
        actions={
          <button className="btn btn-primary" onClick={reprocess} disabled={busy}>
            <RefreshCw size={16} className={busy ? 'spin' : ''} />
            {busy ? 'Reprocesando…' : 'Reprocesar periodo'}
          </button>
        }
      />

      {msg && <div className="alert alert-info">{msg}</div>}
      {error && <ErrorState error={error} />}

      <Card title="Registros" code="MT-OP-002">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin registros de asistencia" />}
      </Card>
    </div>
  )
}
