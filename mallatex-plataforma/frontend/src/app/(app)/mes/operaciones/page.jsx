'use client'

import { useState } from 'react'
import { BellRing, CheckCircle2, Gauge, PackagePlus, PackageMinus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Stat } from '@/components/ui/Stat'
import { Loading, ErrorState, Empty } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { put } from '@/lib/api'
import { brand } from '@/lib/brand'

// MES · Operaciones — panel transversal de piso: avisos, productividad por
// turno y resumen de movimientos de almacén del día.

const TIPO_AVISO = { falla: 'bad', 'sin-material': 'warn', 'sin-hilo': 'warn', montacargas: 'info', avance: 'muted' }

function fmtTs(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtFecha(f) {
  if (!f) return '—'
  const d = new Date(`${f}`.length === 10 ? `${f}T12:00:00` : f)
  if (Number.isNaN(d.getTime())) return String(f)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

const num = (v, dec = 0) => Number(v || 0).toLocaleString('es-MX', { maximumFractionDigits: dec })

// ¿El timestamp corresponde al día de hoy (hora local)?
function isToday(ts) {
  if (!ts) return false
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return false
  return d.toDateString() === new Date().toDateString()
}

export default function OperacionesPage() {
  const avisosQ = useData('/api/mes/avisos')
  const prodQ = useData('/api/mes/productividad')
  const linesQ = useData('/api/mes/lines')
  const recepQ = useData('/api/mes/recepciones')
  const egresQ = useData('/api/mes/egresos')

  const avisos = asList(avisosQ.data)
  const productividad = asList(prodQ.data)
  const lines = asList(linesQ.data)
  const recepciones = asList(recepQ.data)
  const egresos = asList(egresQ.data)

  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  const lineName = (id) => {
    const l = lines.find((x) => String(x.id) === String(id))
    return l ? l.name || l.code : id ? `Línea ${id}` : '—'
  }

  // El dominio Aviso maneja el ciclo abierto -> resuelto.
  async function resolver(aviso) {
    setBusy(aviso.id)
    setMsg(null)
    try {
      await put(`/api/mes/avisos/${aviso.id}`, { estado: 'resuelto' })
      setMsg({ ok: true, text: `Aviso #${aviso.id} marcado como resuelto.` })
      avisosQ.reload()
    } catch (e) {
      setMsg({ ok: false, text: `No se pudo atender el aviso: ${e.message}` })
    } finally {
      setBusy(null)
    }
  }

  // ---- Avisos de piso ----------------------------------------------
  const abiertos = avisos.filter((a) => (a.estado || 'abierto') !== 'resuelto')
  const avisoCols = ['Hora', 'Tipo', 'Línea', 'Descripción', 'Estado', { label: 'Acción', align: 'right' }]
  const avisoRows = avisos.map((a) => {
    const abierto = (a.estado || 'abierto') !== 'resuelto'
    return [
      <span key="t" className="mono" style={{ fontSize: 12 }}>{fmtTs(a.ts)}</span>,
      <Badge key="k" variant={TIPO_AVISO[a.tipo] || 'muted'}>{a.tipo || '—'}</Badge>,
      lineName(a.lineId ?? a.line_id),
      a.descripcion || '—',
      <Badge key="e" variant={abierto ? 'warn' : 'ok'}>{a.estado || 'abierto'}</Badge>,
      abierto ? (
        <button key="b" className="btn btn-sm btn-primary" onClick={() => resolver(a)} disabled={busy === a.id}>
          <CheckCircle2 size={14} /> {busy === a.id ? 'Atendiendo…' : 'Atender'}
        </button>
      ) : (
        <span key="ok" className="badge badge-muted">cerrado</span>
      ),
    ]
  })

  // ---- Productividad por turno -------------------------------------
  const mlHrVals = productividad.map((p) => Number(p.mlHr ?? p.ml_hr ?? 0)).filter((v) => v > 0)
  const promMlHr = mlHrVals.length ? mlHrVals.reduce((a, b) => a + b, 0) / mlHrVals.length : 0
  const totalMetros = productividad.reduce((a, p) => a + Number(p.metros || 0), 0)
  const totalPiezas = productividad.reduce((a, p) => a + Number(p.piezas || 0), 0)

  const prodCols = ['Fecha', 'Turno', 'Línea', { label: 'Metros', align: 'right' }, { label: 'Piezas', align: 'right' }, { label: 'Horas', align: 'right' }, { label: 'ml/hr', align: 'right' }, { label: 'pz/hr', align: 'right' }]
  const prodRows = productividad.map((p) => {
    const mlHr = Number(p.mlHr ?? p.ml_hr ?? 0)
    return [
      <span key="f" className="mono" style={{ fontSize: 12 }}>{fmtFecha(p.fecha)}</span>,
      <Badge key="t" variant="info">{p.turno || '—'}</Badge>,
      lineName(p.lineId ?? p.line_id),
      num(p.metros, 1),
      num(p.piezas),
      num(p.horas, 1),
      <span key="m" className="mono" style={{ color: promMlHr && mlHr < promMlHr ? brand.warn : brand.ok, fontWeight: 600 }}>
        {num(mlHr, 2)}
      </span>,
      num(p.pzHr ?? p.pz_hr, 2),
    ]
  })

  // ---- Resumen de movimientos del día ------------------------------
  const recepHoy = recepciones.filter((r) => isToday(r.ts)).length
  const egresHoy = egresos.filter((r) => isToday(r.ts)).length
  const movErr = recepQ.error || egresQ.error

  return (
    <div>
      <PageHeader
        title="Operaciones"
        subtitle="Avisos de piso, productividad por turno y movimientos de almacén"
        code="MT-PC-OPS"
      />
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}

      <div className="grid grid-stats" style={{ marginBottom: 16 }}>
        <Stat label="Avisos abiertos" value={num(abiertos.length)} variant={abiertos.length ? 'warn' : 'ok'} icon={BellRing} sub={`${num(avisos.length)} en total`} />
        <Stat label="Promedio ml/hr" value={num(promMlHr, 1)} variant="red" icon={Gauge} sub={`${num(totalMetros)} m · ${num(totalPiezas)} pz`} />
        <Stat label="Recepciones hoy" value={movErr ? '—' : num(recepHoy)} icon={PackagePlus} sub={movErr ? 'sin acceso a almacén' : `${num(recepciones.length)} históricas`} />
        <Stat label="Egresos hoy" value={movErr ? '—' : num(egresHoy)} icon={PackageMinus} sub={movErr ? 'sin acceso a almacén' : `${num(egresos.length)} históricos`} />
      </div>

      {avisosQ.error && <ErrorState error={avisosQ.error} />}
      <Card title="Avisos de piso" code="MT-PC-OPS">
        {avisosQ.loading && !avisosQ.data ? (
          <Loading label="Cargando avisos…" />
        ) : avisos.length === 0 ? (
          <Empty title="Sin avisos de piso" hint="Las alertas reportadas desde las tablets de línea aparecerán aquí." icon={BellRing} />
        ) : (
          <Table cols={avisoCols} rows={avisoRows} empty="Sin avisos" />
        )}
      </Card>

      {prodQ.error && <ErrorState error={prodQ.error} />}
      <Card title="Productividad por turno">
        {prodQ.loading && !prodQ.data ? (
          <Loading label="Cargando productividad…" />
        ) : (
          <Table cols={prodCols} rows={prodRows} empty="Sin registros de productividad" />
        )}
      </Card>

      <Card title="Resumen de movimientos de almacén (hoy)" pad>
        {movErr ? (
          <div className="alert alert-err" style={{ marginBottom: 0 }}>
            No fue posible consultar recepciones/egresos: {(recepQ.error || egresQ.error)?.message}
          </div>
        ) : (recepQ.loading && !recepQ.data) || (egresQ.loading && !egresQ.data) ? (
          <Loading label="Calculando movimientos…" />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))' }}>
            <div className="row" style={{ gap: 10 }}>
              <PackagePlus size={18} color={brand.ok} />
              <div>
                <strong>{num(recepHoy)}</strong> recepciones de material hoy
                <div style={{ fontSize: 12, color: brand.gray }}>{num(recepciones.length)} registradas en total</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <PackageMinus size={18} color={brand.red} />
              <div>
                <strong>{num(egresHoy)}</strong> egresos a producción hoy
                <div style={{ fontSize: 12, color: brand.gray }}>{num(egresos.length)} registrados en total</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
