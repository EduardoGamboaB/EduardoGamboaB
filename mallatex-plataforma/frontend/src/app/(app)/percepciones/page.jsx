'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2, X, DollarSign, ListChecks } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, del } from '@/lib/api'

const FUENTES_SYNC = ['g3', 'mes', 'aspel']
const FUENTE_VARIANT = { manual: 'muted', g3: 'info', mes: 'warn', aspel: 'ok' }

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
function fmtMoney(v) {
  const n = Number(v)
  return Number.isNaN(n) ? '—' : money.format(n)
}

// Percepciones variables (MT-NOI-VAR): captura por periodo de conceptos
// variables de nómina + sincronización desde fuentes externas (G3/MES/Aspel).
export default function PercepcionesPage() {
  const { data: perData, loading: perLoading, error: perError } = useData('/api/periods')
  const { data: conData, error: conError } = useData('/api/variable-concepts')
  const { data: empData } = useData('/api/employees')

  const periods = asList(perData)
  const concepts = asList(conData)
  const employees = asList(empData)

  const [periodId, setPeriodId] = useState('')

  // Al cargar periodos: preseleccionar el abierto (o el primero).
  useEffect(() => {
    if (periodId || periods.length === 0) return
    const abierto = periods.find((p) => String(p.status || p.estado || '').toLowerCase() === 'abierto')
    setPeriodId(String((abierto || periods[0]).id))
  }, [periods, periodId])

  const period = periods.find((p) => String(p.id) === String(periodId)) || null
  const abierto = !!period && String(period.status || period.estado || '').toLowerCase() === 'abierto'

  const {
    data: entData,
    loading: entLoading,
    error: entError,
    reload: reloadEntries,
  } = useData(periodId ? `/api/variable-entries?period=${encodeURIComponent(periodId)}` : null, [])
  const entries = asList(entData)

  const empById = useMemo(() => {
    const m = new Map()
    employees.forEach((e) => m.set(String(e.id), e))
    return m
  }, [employees])
  const conById = useMemo(() => {
    const m = new Map()
    concepts.forEach((c) => m.set(String(c.id), c))
    return m
  }, [concepts])

  function empName(id) {
    const e = empById.get(String(id))
    return (e && (e.name || e.nombre)) || `Empleado #${id ?? '—'}`
  }
  function conName(id) {
    const c = conById.get(String(id))
    return (c && (c.name || c.key)) || `Concepto #${id ?? '—'}`
  }

  // Captura manual -----------------------------------------------------------
  const [form, setForm] = useState(null) // null = cerrado
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok'|'err', text }

  function openForm() {
    setForm({ employeeId: '', conceptId: '', cantidad: '', note: '' })
    setMsg(null)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await post('/api/variable-entries', {
        periodId,
        employeeId: form.employeeId,
        conceptId: form.conceptId,
        cantidad: Number(form.cantidad),
        note: form.note,
      })
      const importe = res && (res.importe ?? res.amount)
      setMsg({
        kind: 'ok',
        text: `Captura registrada para ${empName(form.employeeId)} · ${conName(form.conceptId)}${
          importe != null ? ` · importe calculado: ${fmtMoney(importe)}` : ''
        }`,
      })
      setForm(null)
      reloadEntries()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // Eliminación (solo periodo abierto) ---------------------------------------
  const [deletingId, setDeletingId] = useState(null)

  async function removeEntry(entry) {
    if (!window.confirm(`¿Eliminar la captura de ${empName(entry.employeeId)} (${conName(entry.conceptId)})?`)) return
    setDeletingId(entry.id)
    setMsg(null)
    try {
      await del(`/api/variable-entries/${entry.id}`)
      setMsg({ kind: 'ok', text: 'Captura eliminada.' })
      reloadEntries()
    } catch (err) {
      setMsg({ kind: 'err', text: err.message })
    } finally {
      setDeletingId(null)
    }
  }

  // Sincronización de fuentes externas ---------------------------------------
  const [syncing, setSyncing] = useState(null) // fuente en curso
  const [syncResult, setSyncResult] = useState(null) // { source, summary }

  async function sync(source) {
    setSyncing(source)
    setMsg(null)
    setSyncResult(null)
    try {
      const res = await post('/api/variable-sync', { source, periodId })
      const parts = []
      if (res && typeof res === 'object') {
        if (res.created != null) parts.push(`${res.created} nuevas`)
        if (res.updated != null) parts.push(`${res.updated} actualizadas`)
        if (res.skipped != null) parts.push(`${res.skipped} omitidas`)
        if (res.total != null) parts.push(`${res.total} en total`)
        if (parts.length === 0 && (res.message || res.summary)) parts.push(res.message || res.summary)
      }
      setSyncResult({
        source,
        summary: parts.length ? parts.join(' · ') : 'Sincronización completada.',
      })
      reloadEntries()
    } catch (err) {
      setMsg({ kind: 'err', text: `Sincronización ${source.toUpperCase()}: ${err.message}` })
    } finally {
      setSyncing(null)
    }
  }

  // Stats --------------------------------------------------------------------
  const totalImporte = entries.reduce((acc, r) => acc + (Number(r.importe ?? r.amount) || 0), 0)
  const porFuente = entries.reduce((acc, r) => {
    const s = String(r.source || 'manual').toLowerCase()
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const fuenteSub = Object.entries(porFuente).map(([s, n]) => `${s}: ${n}`).join(' · ') || 'sin capturas'

  // Tabla --------------------------------------------------------------------
  const cols = abierto
    ? ['Empleado', 'Concepto', 'Cantidad', 'Importe', 'Fuente', 'Nota', { label: '', align: 'right' }]
    : ['Empleado', 'Concepto', 'Cantidad', 'Importe', 'Fuente', 'Nota']
  const tableRows = entries.map((r) => {
    const src = String(r.source || 'manual').toLowerCase()
    const base = [
      <strong key="e">{empName(r.employeeId)}</strong>,
      conName(r.conceptId),
      <span key="q" className="mono">{r.cantidad ?? '—'}</span>,
      <span key="i" className="mono">{fmtMoney(r.importe ?? r.amount)}</span>,
      <Badge key="f" variant={FUENTE_VARIANT[src] || 'muted'}>{src}</Badge>,
      r.note || r.nota || '—',
    ]
    if (abierto) {
      base.push(
        <button
          key="d"
          className="icon-btn"
          title="Eliminar captura"
          aria-label="Eliminar captura"
          disabled={deletingId === r.id}
          onClick={() => removeEntry(r)}
        >
          <Trash2 size={16} />
        </button>
      )
    }
    return base
  })

  const enabledConcepts = concepts.filter((c) => c.enabled !== false)

  return (
    <div>
      <PageHeader
        title="Percepciones variables"
        subtitle="Captura por periodo de conceptos variables (comisiones, kilometraje, costura)"
        code="MT-NOI-VAR"
      />
      {perError && <ErrorState error={perError} />}
      {conError && <ErrorState error={conError} />}
      {entError && <ErrorState error={entError} />}
      {msg && <div className={msg.kind === 'ok' ? 'alert alert-info' : 'alert alert-err'}>{msg.text}</div>}
      {syncResult && (
        <div className="alert alert-info">
          Sincronización <strong>{syncResult.source.toUpperCase()}</strong>: {syncResult.summary}{' '}
          <span className="muted">(re-sincronizar no duplica: la carga es idempotente)</span>
        </div>
      )}

      <Card
        title="Periodo"
        actions={
          period && (
            <Badge variant={abierto ? 'ok' : 'muted'}>{abierto ? 'abierto' : 'cerrado'}</Badge>
          )
        }
        pad
      >
        {perLoading && periods.length === 0 ? (
          <Loading />
        ) : periods.length === 0 ? (
          <Empty title="Sin periodos" hint="Crea un periodo de nómina para capturar percepciones." />
        ) : (
          <div className="row wrap" style={{ gap: 10 }}>
            <label style={{ flex: '1 1 220px' }}>
              Periodo de nómina
              <select value={periodId} onChange={(e) => { setPeriodId(e.target.value); setForm(null); setSyncResult(null); setMsg(null) }}>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.name || p.nombre || `Periodo #${p.id}`) +
                      (String(p.status || p.estado || '').toLowerCase() === 'abierto' ? ' (abierto)' : '')}
                  </option>
                ))}
              </select>
            </label>
            {!abierto && period && (
              <span className="muted" style={{ fontSize: 13 }}>
                Periodo cerrado: solo consulta, sin capturas ni sincronización.
              </span>
            )}
          </div>
        )}
      </Card>

      {periodId && (
        <div className="grid grid-stats" style={{ marginBottom: 16 }}>
          <Stat label="Importe del periodo" value={fmtMoney(totalImporte)} variant="ok" icon={DollarSign} sub={period?.name || period?.nombre} />
          <Stat label="Capturas" value={entries.length} icon={ListChecks} sub={fuenteSub} />
        </div>
      )}

      {form && abierto && (
        <Card
          title="Nueva captura"
          actions={<button className="icon-btn" onClick={() => setForm(null)} aria-label="Cerrar"><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
              <label>Empleado
                <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} required>
                  <option value="">Selecciona…</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || e.nombre || `#${e.id}`}</option>
                  ))}
                </select>
              </label>
              <label>Concepto
                <select value={form.conceptId} onChange={(e) => setForm({ ...form, conceptId: e.target.value })} required>
                  <option value="">Selecciona…</option>
                  {enabledConcepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.name || c.key) + (c.noiNumber != null ? ` · NOI ${c.noiNumber}` : '') + (c.modo ? ` (${c.modo})` : '')}
                    </option>
                  ))}
                </select>
              </label>
              <label>Cantidad
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                  required
                />
              </label>
              <label>Nota
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opcional" />
              </label>
            </div>
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar captura'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card
        title="Capturas del periodo"
        actions={
          abierto && (
            <div className="row wrap" style={{ gap: 6 }}>
              {FUENTES_SYNC.map((s) => (
                <button
                  key={s}
                  className="btn btn-sm"
                  disabled={!!syncing}
                  onClick={() => sync(s)}
                  title={`Sincronizar ${s.toUpperCase()} (idempotente: re-sincronizar no duplica)`}
                >
                  <RefreshCw size={14} /> {syncing === s ? 'Sincronizando…' : s.toUpperCase()}
                </button>
              ))}
              {!form && (
                <button className="btn btn-sm btn-primary" onClick={openForm}>
                  <Plus size={14} /> Nueva captura
                </button>
              )}
            </div>
          )
        }
      >
        {!periodId ? (
          <Empty title="Selecciona un periodo" />
        ) : entLoading && !entData ? (
          <Loading />
        ) : (
          <Table cols={cols} rows={tableRows} empty="Sin capturas en este periodo" />
        )}
      </Card>
    </div>
  )
}
