'use client'

import { useState, useMemo } from 'react'
import { FileText, Ban, Zap, Plug, CircleDollarSign, Clock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
const fecha = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const FILTROS = ['todas', 'solicitada', 'emitida', 'pagada', 'cancelada']
const STATUS_VARIANT = { solicitada: 'warn', emitida: 'info', pagada: 'ok', cancelada: 'bad' }

// CRM · Facturación — emisión (timbrado) y cancelación de CFDI.
// Consume /api/crm/invoices y el diagnóstico /api/crm/integrations/status.
export default function FacturacionPage() {
  const { data, loading, error, reload } = useData('/api/crm/invoices')
  const integraciones = useData('/api/crm/integrations/status')
  const [filtro, setFiltro] = useState('todas')
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null) // { type: 'info'|'err', text }

  const rows = asList(data)
  const filtered = useMemo(
    () => (filtro === 'todas' ? rows : rows.filter((i) => String(i.status || '').toLowerCase() === filtro)),
    [rows, filtro]
  )

  // KPIs sobre el listado completo.
  const emitido = rows.filter((i) => i.status === 'emitida').reduce((a, i) => a + Number(i.amount || 0), 0)
  const pagado = rows.filter((i) => i.status === 'pagada').reduce((a, i) => a + Number(i.amount || 0), 0)
  const solicitadas = rows.filter((i) => i.status === 'solicitada').length

  async function emitir(inv) {
    setBusy(`emit-${inv.id}`)
    setMsg(null)
    try {
      const res = await post(`/api/crm/invoices/${inv.id}/emit`, {})
      setMsg({ type: 'info', text: `Factura ${inv.folio || `#${inv.id}`} emitida. UUID: ${res?.uuid || '—'}` })
      reload()
    } catch (e) {
      setMsg({ type: 'err', text: `No se pudo emitir: ${e.message}` })
    } finally {
      setBusy(null)
    }
  }

  async function cancelar(inv) {
    if (!window.confirm(`¿Cancelar la factura ${inv.folio || `#${inv.id}`}? Esta acción no se puede deshacer.`)) return
    setBusy(`cancel-${inv.id}`)
    setMsg(null)
    try {
      await post(`/api/crm/invoices/${inv.id}/cancel`, {})
      setMsg({ type: 'info', text: `Factura ${inv.folio || `#${inv.id}`} cancelada.` })
      reload()
    } catch (e) {
      setMsg({ type: 'err', text: `No se pudo cancelar: ${e.message}` })
    } finally {
      setBusy(null)
    }
  }

  const cols = ['Folio', 'Cliente', 'RFC', 'Uso CFDI', { label: 'Importe', align: 'right' }, 'Estado', 'UUID / Pago', { label: 'Acciones', align: 'right' }]
  const tableRows = filtered.map((i) => {
    const st = String(i.status || '').toLowerCase()
    const rowBusy = busy === `emit-${i.id}` || busy === `cancel-${i.id}`
    return [
      <span key="f" className="mono">{i.folio || `#${i.id}`}</span>,
      <strong key="c">{i.clientName || i.razonSocial || '—'}</strong>,
      <span key="r" className="mono">{i.rfc || '—'}</span>,
      i.usoCfdi || '—',
      <span key="m" className="mono">{money(i.amount)}</span>,
      <Badge key="s" variant={STATUS_VARIANT[st] || 'muted'}>{st || '—'}</Badge>,
      st === 'pagada' ? (
        <span key="u" className="mono muted" style={{ fontSize: 11.5 }}>
          {fecha(i.paidAt)} {i.paymentRef ? `· ${i.paymentRef}` : ''}
        </span>
      ) : (
        <span key="u" className="mono muted" style={{ fontSize: 11.5 }}>{i.uuid || '—'}</span>
      ),
      <div key="a" className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
        {st === 'solicitada' && (
          <button className="btn btn-sm btn-primary" onClick={() => emitir(i)} disabled={rowBusy}>
            <Zap size={14} /> {busy === `emit-${i.id}` ? 'Emitiendo…' : 'Emitir'}
          </button>
        )}
        {(st === 'solicitada' || st === 'emitida') && (
          <button className="btn btn-sm" onClick={() => cancelar(i)} disabled={rowBusy}>
            <Ban size={14} /> {busy === `cancel-${i.id}` ? 'Cancelando…' : 'Cancelar'}
          </button>
        )}
        {st !== 'solicitada' && st !== 'emitida' && <span className="muted">—</span>}
      </div>,
    ]
  })

  const conectores = asList(integraciones.data)

  return (
    <div>
      <PageHeader
        title="Facturación"
        subtitle="Emisión y control de CFDI de las ventas comerciales"
        code="MT-CRM-FAC"
      />
      {msg && <div className={`alert ${msg.type === 'err' ? 'alert-err' : 'alert-info'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <Stat label="Monto emitido" value={money(emitido)} icon={FileText} sub="Facturas emitidas (sin pagar)" />
        <Stat label="Monto pagado" value={money(pagado)} variant="ok" icon={CircleDollarSign} />
        <Stat label="Solicitadas" value={solicitadas} variant={solicitadas ? 'warn' : 'ok'} icon={Clock} sub="Pendientes de emitir" />
      </div>

      <div className="row wrap" style={{ marginBottom: 12 }}>
        {FILTROS.map((f) => (
          <button key={f} className={`btn btn-sm ${filtro === f ? 'btn-dark' : ''}`} onClick={() => setFiltro(f)}>
            {f === 'todas' ? `Todas (${rows.length})` : `${f} (${rows.filter((i) => String(i.status || '').toLowerCase() === f).length})`}
          </button>
        ))}
      </div>

      <Card title="Facturas">
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin facturas con ese estado" />}
      </Card>

      <Card title="Integraciones" actions={<Plug size={16} className="muted" />}>
        <div className="card-body">
          {integraciones.error && <ErrorState error={integraciones.error} />}
          {integraciones.loading && !integraciones.data ? (
            <Loading />
          ) : conectores.length === 0 ? (
            <p className="muted">Sin conectores configurados.</p>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))' }}>
              {conectores.map((c) => (
                <div key={c.id || c.source} className="card" style={{ padding: 14 }}>
                  <div className="row wrap" style={{ gap: 8 }}>
                    <strong className="mono">{c.id || c.source || '—'}</strong>
                    <Badge variant={c.mode === 'mock' || c.mode === 'abierto' ? 'warn' : 'ok'}>{c.mode || '—'}</Badge>
                    <Badge variant={c.configured ? 'ok' : 'muted'}>{c.configured ? 'configurado' : 'sin configurar'}</Badge>
                  </div>
                  {c.note && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{c.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
