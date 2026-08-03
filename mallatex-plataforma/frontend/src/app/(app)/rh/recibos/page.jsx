'use client'

import { useMemo, useState } from 'react'
import { FileText, Play, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { get, post } from '@/lib/api'

// Recibos de nómina preliminares por periodo. El cálculo fiscal definitivo
// (ISR/IMSS) se realiza en Aspel NOI; aquí se generan y consultan recibos.
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const money = (n) => mxn.format(Number(n) || 0)

export default function RecibosPage() {
  const periods = useData('/api/periods')
  const payslips = useData('/api/rh/payslips')

  const periodList = asList(periods.data)
  const allSlips = asList(payslips.data)

  const [periodId, setPeriodId] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok'|'err', text }

  // Detalle expandido (GET /api/rh/payslips/:id)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const filtered = useMemo(() => {
    if (!periodId) return allSlips
    return allSlips.filter((s) => String(s.periodId) === String(periodId))
  }, [allSlips, periodId])

  async function generate() {
    if (!periodId) {
      setMsg({ kind: 'err', text: 'Selecciona un periodo para generar los recibos.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await post('/api/rh/payslips/generate', { periodId: Number(periodId) })
      setMsg({ kind: 'ok', text: `Se generaron ${res?.count ?? 0} recibos del periodo.` })
      setDetail(null)
      payslips.reload()
    } catch (e) {
      setMsg({ kind: 'err', text: `No se pudieron generar los recibos: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  async function openDetail(slip) {
    setDetailLoading(true)
    setMsg(null)
    try {
      const full = await get(`/api/rh/payslips/${slip.id}`)
      setDetail({ ...slip, ...full })
    } catch (e) {
      setMsg({ kind: 'err', text: `No se pudo cargar el recibo: ${e.message}` })
    } finally {
      setDetailLoading(false)
    }
  }

  const cols = [
    'Empleado',
    'Periodo',
    { label: 'Percepciones', align: 'right' },
    { label: 'Deducciones', align: 'right' },
    { label: 'Neto', align: 'right' },
    'Emitido',
    '',
  ]
  const tableRows = filtered.map((s) => [
    <div key="e">
      <strong>{s.employeeName || `#${s.employeeId}`}</strong>
      <div className="muted" style={{ fontSize: 12 }}>
        {[s.employeeCode, s.department].filter(Boolean).join(' · ') || '—'}
      </div>
    </div>,
    s.periodName || `#${s.periodId}`,
    money(s.totalP),
    money(s.totalD),
    <strong key="n">{money(s.neto)}</strong>,
    s.emittedAt ? String(s.emittedAt).slice(0, 10) : '—',
    <button key="v" className="btn btn-sm" onClick={() => openDetail(s)} disabled={detailLoading}>
      <FileText size={14} /> Ver
    </button>,
  ])

  const loading = (periods.loading && !periods.data) || (payslips.loading && !payslips.data)
  const error = periods.error || payslips.error

  return (
    <div>
      <PageHeader
        title="Recibos de nómina"
        subtitle="Generación y consulta de recibos preliminares por periodo"
        code="MT-RH-REC"
        actions={
          <div className="row wrap" style={{ gap: 8 }}>
            <select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value)
                setDetail(null)
              }}
              style={{ minHeight: 40, maxWidth: 240 }}
              aria-label="Periodo"
            >
              <option value="">Todos los periodos</option>
              {periodList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || `Periodo #${p.id}`}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={generate} disabled={busy}>
              <Play size={16} />
              {busy ? 'Generando…' : 'Generar recibos del periodo'}
            </button>
          </div>
        }
      />

      {msg && <div className={`alert ${msg.kind === 'err' ? 'alert-err' : 'alert-info'}`}>{msg.text}</div>}
      {error && <ErrorState error={error} />}

      {detail && (
        <Card
          title={`Recibo · ${detail.employeeName || `Empleado #${detail.employeeId}`}`}
          code="MT-RH-REC"
          actions={
            <button className="btn btn-sm btn-ghost" onClick={() => setDetail(null)}>
              <X size={14} /> Cerrar
            </button>
          }
        >
          <div className="card-body">
            <p className="muted" style={{ marginBottom: 12 }}>
              {detail.periodName || `Periodo #${detail.periodId}`}
              {detail.emittedAt ? ` · emitido ${String(detail.emittedAt).slice(0, 10)}` : ''}
            </p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <h4 style={{ marginBottom: 8 }}>Percepciones</h4>
                <Table
                  cols={['Concepto', { label: 'Días/Hrs', align: 'right' }, { label: 'Importe', align: 'right' }]}
                  rows={(detail.perceptions || []).map((p) => [
                    p.concepto,
                    p.dias != null ? `${p.dias} d` : p.horas != null ? `${p.horas} h` : '—',
                    money(p.importe),
                  ])}
                  empty="Sin percepciones"
                />
              </div>
              <div>
                <h4 style={{ marginBottom: 8 }}>Deducciones</h4>
                <Table
                  cols={['Concepto', { label: 'Días', align: 'right' }, { label: 'Importe', align: 'right' }]}
                  rows={(detail.deductions || []).map((d) => [
                    d.concepto,
                    d.dias != null ? `${d.dias} d` : '—',
                    money(d.importe),
                  ])}
                  empty="Sin deducciones"
                />
              </div>
            </div>
            <div className="row wrap" style={{ gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
              <span className="muted">Percepciones: <strong>{money(detail.totalP)}</strong></span>
              <span className="muted">Deducciones: <strong>{money(detail.totalD)}</strong></span>
              <Badge variant="ok">Neto {money(detail.neto)}</Badge>
            </div>
          </div>
        </Card>
      )}

      <Card title="Recibos emitidos" code="MT-RH-REC">
        {loading ? (
          <Loading label="Cargando recibos…" />
        ) : (
          <Table
            cols={cols}
            rows={tableRows}
            empty={periodId ? 'Sin recibos para este periodo. Usa "Generar recibos del periodo".' : 'Sin recibos generados'}
          />
        )}
      </Card>
    </div>
  )
}
