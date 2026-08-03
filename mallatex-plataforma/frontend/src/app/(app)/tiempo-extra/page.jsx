'use client'

import { useMemo, useState } from 'react'
import { Clock, CheckCircle2, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'

const ESTADOS = ['pendiente', 'autorizada', 'rechazada', 'todos']

const ESTADO_VARIANT = { pendiente: 'warn', autorizada: 'ok', rechazada: 'bad' }

function fmtMin(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `${n} min`
}

// Tiempo extra (MT-OP-TE): listado de horas extra calculadas y su autorización.
// Consume /api/overtime + /api/employees; autoriza/rechaza vía POST.
export default function TiempoExtraPage() {
  const { data, loading, error, reload } = useData('/api/overtime')
  const { data: empData } = useData('/api/employees')
  const rows = asList(data)
  const employees = asList(empData)

  const [estado, setEstado] = useState('pendiente')
  const [authRow, setAuthRow] = useState(null) // { id, minutes } → form inline abierto
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null) // { kind: 'ok'|'err', text }

  const empById = useMemo(() => {
    const m = new Map()
    employees.forEach((e) => m.set(String(e.id), e))
    return m
  }, [employees])

  function empName(id) {
    const e = empById.get(String(id))
    return (e && (e.name || e.nombre)) || `Empleado #${id ?? '—'}`
  }

  const filtered = useMemo(() => {
    if (estado === 'todos') return rows
    return rows.filter((r) => String(r.status || '').toLowerCase() === estado)
  }, [rows, estado])

  // KPIs del listado completo
  const pendientes = rows.filter((r) => String(r.status || '').toLowerCase() === 'pendiente').length
  const minAutorizados = rows
    .filter((r) => String(r.status || '').toLowerCase() === 'autorizada')
    .reduce((acc, r) => acc + (Number(r.authorizedMinutes) || 0), 0)

  async function authorize(row) {
    const minutes = Number(authRow?.minutes)
    if (Number.isNaN(minutes) || minutes < 0) {
      setMsg({ kind: 'err', text: 'Indica los minutos autorizados (número válido).' })
      return
    }
    setBusyId(row.id)
    setMsg(null)
    try {
      await post(`/api/overtime/${row.id}/authorize`, { authorizedMinutes: minutes })
      setAuthRow(null)
      setMsg({ kind: 'ok', text: `Tiempo extra de ${empName(row.employeeId)} autorizado (${minutes} min).` })
      reload()
    } catch (e) {
      setMsg({ kind: 'err', text: e.message })
    } finally {
      setBusyId(null)
    }
  }

  async function reject(row) {
    setBusyId(row.id)
    setMsg(null)
    try {
      await post(`/api/overtime/${row.id}/reject`)
      setAuthRow(null)
      setMsg({ kind: 'ok', text: `Tiempo extra de ${empName(row.employeeId)} rechazado.` })
      reload()
    } catch (e) {
      setMsg({ kind: 'err', text: e.message })
    } finally {
      setBusyId(null)
    }
  }

  const cols = ['Empleado', 'Fecha', 'Tipo', 'Calculado', 'Autorizado', 'Estado', { label: 'Acciones', align: 'right' }]
  const tableRows = filtered.map((r) => {
    const st = String(r.status || 'pendiente').toLowerCase()
    const tipo = String(r.type || 'ordinario').toLowerCase()
    const busy = busyId === r.id
    const editing = authRow && authRow.id === r.id
    return [
      <strong key="e">{empName(r.employeeId)}</strong>,
      r.date || '—',
      <Badge key="t" variant={tipo === 'doble' ? 'red' : 'info'}>{tipo}</Badge>,
      <span key="c" className="mono">{fmtMin(r.calculatedMinutes)}</span>,
      <span key="a" className="mono">{st === 'autorizada' ? fmtMin(r.authorizedMinutes) : '—'}</span>,
      <span key="s" className="row" style={{ gap: 6, display: 'inline-flex' }}>
        <Badge variant={ESTADO_VARIANT[st] || 'muted'}>{st}</Badge>
        {st === 'autorizada' && r.authorizedBy ? <small className="muted">por {r.authorizedBy}</small> : null}
      </span>,
      st === 'pendiente' ? (
        editing ? (
          <span key="x" className="row wrap" style={{ gap: 6, justifyContent: 'flex-end', display: 'inline-flex' }}>
            <input
              type="number"
              min="0"
              style={{ minHeight: 36, width: 90 }}
              value={authRow.minutes}
              onChange={(e) => setAuthRow({ ...authRow, minutes: e.target.value })}
              aria-label="Minutos autorizados"
            />
            <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => authorize(r)}>
              {busy ? 'Guardando…' : 'Confirmar'}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setAuthRow(null)} aria-label="Cancelar">
              <X size={14} />
            </button>
          </span>
        ) : (
          <span key="x" className="row" style={{ gap: 6, justifyContent: 'flex-end', display: 'inline-flex' }}>
            <button
              className="btn btn-sm btn-dark"
              disabled={busy}
              onClick={() => { setAuthRow({ id: r.id, minutes: r.calculatedMinutes ?? 0 }); setMsg(null) }}
            >
              Autorizar
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => reject(r)}>
              {busy ? '…' : 'Rechazar'}
            </button>
          </span>
        )
      ) : (
        <span key="x" className="muted">—</span>
      ),
    ]
  })

  return (
    <div>
      <PageHeader
        title="Tiempo extra"
        subtitle="Horas extra calculadas por checador y su autorización"
        code="MT-OP-TE"
      />
      {error && <ErrorState error={error} />}
      {msg && (
        <div className={msg.kind === 'ok' ? 'alert alert-info' : 'alert alert-err'}>{msg.text}</div>
      )}

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <Stat label="Pendientes" value={pendientes} variant="warn" icon={Clock} sub="por autorizar" />
        <Stat label="Min. autorizados" value={minAutorizados} variant="ok" icon={CheckCircle2} sub="del listado" />
      </div>

      <Card
        title="Registros"
        actions={
          <div className="row wrap" style={{ gap: 6 }}>
            {ESTADOS.map((s) => (
              <button
                key={s}
                className={`btn btn-sm${estado === s ? ' btn-dark' : ''}`}
                onClick={() => setEstado(s)}
              >
                {s}
              </button>
            ))}
          </div>
        }
      >
        {loading && !data ? (
          <Loading />
        ) : (
          <Table cols={cols} rows={tableRows} empty={`Sin registros${estado !== 'todos' ? ` en estado "${estado}"` : ''}`} />
        )}
      </Card>
    </div>
  )
}
