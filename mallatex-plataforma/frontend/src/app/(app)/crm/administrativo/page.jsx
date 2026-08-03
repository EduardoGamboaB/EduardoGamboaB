'use client'

import { useState } from 'react'
import { Wallet, Receipt, CheckCircle2, XCircle, ImageIcon, Clock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, get } from '@/lib/api'

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const STATUS_VARIANT = { solicitada: 'warn', aprobado: 'ok', rechazado: 'bad' }

function StatusBadge({ status }) {
  const st = String(status || '').toLowerCase()
  return <Badge variant={STATUS_VARIANT[st] || 'muted'}>{st || '—'}</Badge>
}

// CRM · Administrativo — revisión y decisión de viáticos y gastos comerciales.
// Consume /api/crm/expense-requests y /api/crm/expenses (+ decision por fila).
export default function AdministrativoPage() {
  const viaticos = useData('/api/crm/expense-requests')
  const gastos = useData('/api/crm/expenses')
  const [tab, setTab] = useState('viaticos')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null) // { type: 'info'|'err', text }

  const vRows = asList(viaticos.data)
  const gRows = asList(gastos.data)

  // KPIs del listado completo (ambas pestañas).
  const pendViaticos = vRows.filter((r) => r.status === 'solicitada').length
  const pendGastos = gRows.filter((r) => r.status === 'solicitada').length
  const montoAprobado =
    vRows.filter((r) => r.status === 'aprobado').reduce((a, r) => a + Number(r.amount || 0), 0) +
    gRows.filter((r) => r.status === 'aprobado').reduce((a, r) => a + Number(r.amount || 0), 0)

  async function decidir(kind, item, decision) {
    const key = `${kind}-${item.id}-${decision}`
    setBusy(key)
    setMsg(null)
    const path = kind === 'via' ? `/api/crm/expense-requests/${item.id}/decision` : `/api/crm/expenses/${item.id}/decision`
    try {
      await post(path, { decision })
      setMsg({
        type: 'info',
        text: `${kind === 'via' ? 'Viático' : 'Gasto'} ${item.folio || `#${item.id}`} ${decision === 'aprobado' ? 'aprobado' : 'rechazado'}.`,
      })
      ;(kind === 'via' ? viaticos : gastos).reload()
    } catch (e) {
      setMsg({ type: 'err', text: `No se pudo registrar la decisión: ${e.message}` })
    } finally {
      setBusy(null)
    }
  }

  // La evidencia viaja como data-URL en JSON; se convierte a blob para abrirla
  // en una pestaña nueva (un data: URL no se puede abrir directo).
  async function verTicket(item) {
    const key = `foto-${item.id}`
    setBusy(key)
    setMsg(null)
    try {
      const res = await get(`/api/crm/expenses/${item.id}/photo`)
      if (!res?.photo) throw new Error('Sin evidencia')
      const blob = await (await fetch(res.photo)).blob()
      window.open(URL.createObjectURL(blob), '_blank', 'noopener')
    } catch (e) {
      setMsg({ type: 'err', text: `No se pudo abrir el ticket: ${e.message}` })
    } finally {
      setBusy(null)
    }
  }

  function decisionButtons(kind, item) {
    if (item.status !== 'solicitada') return <span className="muted">—</span>
    const kA = `${kind}-${item.id}-aprobado`
    const kR = `${kind}-${item.id}-rechazado`
    const anyBusy = busy === kA || busy === kR
    return (
      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        <button className="btn btn-sm btn-primary" onClick={() => decidir(kind, item, 'aprobado')} disabled={anyBusy}>
          <CheckCircle2 size={14} /> {busy === kA ? 'Aprobando…' : 'Aprobar'}
        </button>
        <button className="btn btn-sm" onClick={() => decidir(kind, item, 'rechazado')} disabled={anyBusy}>
          <XCircle size={14} /> {busy === kR ? 'Rechazando…' : 'Rechazar'}
        </button>
      </div>
    )
  }

  // ---- Viáticos -----------------------------------------------------
  const vCols = ['Folio', 'Vendedor', 'Concepto', 'Destino', 'Periodo', { label: 'Monto', align: 'right' }, 'Estado', { label: 'Decisión', align: 'right' }]
  const vTable = vRows.map((r) => [
    <span key="f" className="mono">{r.folio || `#${r.id}`}</span>,
    <strong key="e">{r.employeeName || `#${r.employeeId}`}</strong>,
    r.concept || '—',
    r.destination || '—',
    <span key="p" className="nowrap">{fecha(r.fromDate)} → {fecha(r.toDate)}</span>,
    <span key="m" className="mono">{money(r.amount)}</span>,
    <StatusBadge key="s" status={r.status} />,
    <span key="d">{decisionButtons('via', r)}</span>,
  ])

  // ---- Gastos -------------------------------------------------------
  const gCols = ['Folio', 'Vendedor', 'Categoría', 'Comercio', 'Fecha', { label: 'Monto', align: 'right' }, 'Factura', 'Evidencia', 'Estado', { label: 'Decisión', align: 'right' }]
  const gTable = gRows.map((r) => [
    <span key="f" className="mono">{r.folio || `#${r.id}`}</span>,
    <strong key="e">{r.employeeName || `#${r.employeeId}`}</strong>,
    r.category || '—',
    r.merchant || '—',
    fecha(r.date),
    <span key="m" className="mono">{money(r.amount)}</span>,
    r.hasInvoice ? (
      <span key="i" className="nowrap"><Badge variant="info">factura</Badge> <span className="mono muted">{r.rfc || ''}</span></span>
    ) : (
      <Badge key="i" variant="muted">sin factura</Badge>
    ),
    r.hasPhoto || r.photoCount ? (
      <button key="v" className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={() => verTicket(r)} disabled={busy === `foto-${r.id}`}>
        <ImageIcon size={14} /> {busy === `foto-${r.id}` ? 'Abriendo…' : 'Ver ticket'}
      </button>
    ) : (
      <span key="v" className="muted">—</span>
    ),
    <StatusBadge key="s" status={r.status} />,
    <span key="d">{decisionButtons('gto', r)}</span>,
  ])

  const active = tab === 'viaticos' ? viaticos : gastos
  const anyError = viaticos.error || gastos.error

  return (
    <div>
      <PageHeader
        title="Viáticos y gastos"
        subtitle="Revisión y aprobación de comprobaciones del equipo comercial"
        code="MT-CRM-ADM"
      />
      {msg && <div className={`alert ${msg.type === 'err' ? 'alert-err' : 'alert-info'}`}>{msg.text}</div>}
      {anyError && <ErrorState error={anyError} />}

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <Stat label="Viáticos pendientes" value={pendViaticos} variant={pendViaticos ? 'warn' : 'ok'} icon={Clock} />
        <Stat label="Gastos pendientes" value={pendGastos} variant={pendGastos ? 'warn' : 'ok'} icon={Receipt} />
        <Stat label="Monto aprobado" value={money(montoAprobado)} variant="ok" icon={Wallet} sub="Viáticos + gastos del listado" />
      </div>

      <div className="row wrap" style={{ marginBottom: 12 }}>
        <button className={`btn btn-sm ${tab === 'viaticos' ? 'btn-dark' : ''}`} onClick={() => setTab('viaticos')}>
          <Wallet size={14} /> Viáticos ({vRows.length})
        </button>
        <button className={`btn btn-sm ${tab === 'gastos' ? 'btn-dark' : ''}`} onClick={() => setTab('gastos')}>
          <Receipt size={14} /> Gastos ({gRows.length})
        </button>
      </div>

      {tab === 'viaticos' ? (
        <Card title="Solicitudes de viáticos">
          {viaticos.loading && !viaticos.data ? <Loading /> : <Table cols={vCols} rows={vTable} empty="Sin solicitudes de viáticos" />}
        </Card>
      ) : (
        <Card title="Gastos comprobados">
          {gastos.loading && !gastos.data ? <Loading /> : <Table cols={gCols} rows={gTable} empty="Sin gastos registrados" />}
        </Card>
      )}
      {active.loading && active.data && <p className="muted" style={{ fontSize: 12 }}>Actualizando…</p>}
    </div>
  )
}
