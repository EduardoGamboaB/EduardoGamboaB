'use client'

import { Users, CalendarClock, AlertTriangle, Timer, Award, Ticket } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stat } from '@/components/ui/Stat'
import { Card } from '@/components/ui/Card'
import { BarList } from '@/components/ui/Bars'
import { Loading, Empty, ErrorState } from '@/components/ui/States'
import { useData } from '@/lib/useData'

// Indicadores RH del periodo activo. Consume /api/rh/indicators, que devuelve
// asistencia/puntualidad/ausentismo, desglose por área y top de retardos.
export default function IndicadoresPage() {
  const { data, loading, error } = useData('/api/rh/indicators')
  const d = data || {}
  const period = d.period
  const counts = d.counts || {}

  // Asistencia efectiva por área: (asistencias + retardos) / total registrado.
  const areaItems = Object.entries(d.byArea || {}).map(([area, v]) => {
    const total = (v.asistencias || 0) + (v.retardos || 0) + (v.faltas || 0)
    const pct = total ? ((v.asistencias || 0) + (v.retardos || 0)) / total * 100 : 0
    return { label: area, pct, value: `${Math.round(pct)}% · ${v.faltas || 0} faltas` }
  })

  const topRet = d.topRetardos || []
  const maxRet = Math.max(1, ...topRet.map((t) => t.retardos || 0))
  const retItems = topRet.map((t) => ({
    label: t.employee || '—',
    pct: ((t.retardos || 0) / maxRet) * 100,
    value: `${t.retardos} retardo${t.retardos === 1 ? '' : 's'}`,
    color: 'var(--warn)',
  }))

  const totalCounts =
    (counts.asistencias || 0) + (counts.retardos || 0) + (counts.faltas || 0) + (counts.omisiones || 0) || 1
  const countItems = [
    { label: 'Asistencias', n: counts.asistencias || 0, color: 'var(--ok)' },
    { label: 'Retardos', n: counts.retardos || 0, color: 'var(--warn)' },
    { label: 'Faltas', n: counts.faltas || 0, color: 'var(--err)' },
    { label: 'Omisiones', n: counts.omisiones || 0 },
  ].map((x) => ({ label: x.label, pct: (x.n / totalCounts) * 100, value: x.n, color: x.color }))

  return (
    <div>
      <PageHeader
        title="Indicadores RH"
        subtitle={
          period
            ? `Periodo ${period.name || period.id}${period.startDate ? ` · ${period.startDate} a ${period.endDate}` : ''}`
            : 'KPIs de asistencia, puntualidad y ausentismo del periodo activo'
        }
        code="MT-RH-IND"
      />

      {error && <ErrorState error={error} />}
      {loading && !data ? (
        <Loading label="Calculando indicadores…" />
      ) : !period ? (
        <Card>
          <Empty title="Sin periodo activo" hint="Crea un periodo de nómina para calcular indicadores." />
        </Card>
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Empleados activos" value={d.empleados ?? 0} icon={Users} />
            <Stat label="Asistencia" value={`${d.asistencia ?? 0}%`} sub="del total laborable" variant="ok" icon={CalendarClock} />
            <Stat label="Puntualidad" value={`${d.puntualidad ?? 0}%`} sub="asistencias sin retardo" variant="ok" icon={CalendarClock} />
            <Stat
              label="Ausentismo"
              value={`${d.ausentismo ?? 0}%`}
              sub="faltas y omisiones"
              variant={(d.ausentismo ?? 0) > 5 ? 'bad' : 'default'}
              icon={AlertTriangle}
            />
            <Stat label="Horas extra" value={d.overtimeHours ?? 0} sub="autorizadas en el periodo" icon={Timer} />
            <Stat label="Bono puntualidad" value={d.bonusEligible ?? 0} sub="empleados elegibles" variant="ok" icon={Award} />
            <Stat
              label="Tickets abiertos"
              value={d.ticketsAbiertos ?? 0}
              variant={(d.ticketsAbiertos ?? 0) > 0 ? 'warn' : 'default'}
              icon={Ticket}
            />
            <Stat
              label="Incidencias pendientes"
              value={d.incidenciasPendientes ?? 0}
              variant={(d.incidenciasPendientes ?? 0) > 0 ? 'warn' : 'default'}
              icon={AlertTriangle}
            />
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            <Card title="Asistencia por área" code="MT-RH-IND">
              <div className="card-body">
                {areaItems.length ? <BarList items={areaItems} /> : <p className="muted">Sin registros de asistencia en el periodo.</p>}
              </div>
            </Card>

            <Card title="Distribución de checadas" code="MT-RH-IND">
              <div className="card-body">
                <BarList items={countItems} />
              </div>
            </Card>

            <Card title="Top retardos" code="MT-RH-IND">
              <div className="card-body">
                {retItems.length ? <BarList items={retItems} /> : <p className="muted">Sin retardos registrados en el periodo.</p>}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
