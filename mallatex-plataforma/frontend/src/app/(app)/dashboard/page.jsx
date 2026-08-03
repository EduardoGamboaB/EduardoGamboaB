'use client'

import { Users, CalendarClock, AlertTriangle, Timer, TrendingUp } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Stat } from '@/components/ui/Stat'
import { Card } from '@/components/ui/Card'
import { BarList } from '@/components/ui/Bars'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData } from '@/lib/useData'

// Tablero de operación (Asistencia/NOI). Consume /api/dashboard.
export default function DashboardPage() {
  const { data, loading, error } = useData('/api/dashboard')
  const d = data || {}

  const total = d.totalEmployees ?? d.employees ?? 0
  const present = d.present ?? d.asistencias ?? 0
  const absent = d.absent ?? d.faltas ?? 0
  const incidents = d.incidents ?? d.incidencias ?? 0
  const overtime = d.overtimeHours ?? d.tiempoExtra ?? 0
  const rate = total ? Math.round((present / total) * 100) : 0

  const byDept =
    d.byDepartment ||
    d.porDepartamento || [
      { label: 'Producción', pct: 92 },
      { label: 'Ventas', pct: 85 },
      { label: 'Logística', pct: 78 },
      { label: 'Administración', pct: 96 },
    ]

  return (
    <div>
      <PageHeader
        title="Tablero"
        subtitle="Resumen operativo de asistencia y nómina en tiempo real"
        code="MT-OP-DASH"
      />

      {error && <ErrorState error={error} />}
      {loading && !data ? (
        <Loading label="Cargando indicadores…" />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Empleados" value={total} icon={Users} />
            <Stat label="Asistencia hoy" value={`${rate}%`} sub={`${present} presentes`} variant="ok" icon={CalendarClock} />
            <Stat label="Faltas" value={absent} variant={absent > 0 ? 'bad' : 'default'} icon={AlertTriangle} />
            <Stat label="Incidencias" value={incidents} variant="warn" icon={AlertTriangle} />
            <Stat label="Horas extra" value={overtime} sub="acumuladas periodo" icon={Timer} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            <Card title="Asistencia por área" code="MT-OP-002">
              <div className="card-body">
                <BarList
                  items={(byDept || []).map((x) => ({
                    label: x.label || x.name || x.department,
                    pct: x.pct ?? x.rate ?? 0,
                  }))}
                />
              </div>
            </Card>

            <Card title="Resumen del periodo" code="MT-NOI-001">
              <div className="card-body">
                <div className="row" style={{ gap: 10, marginBottom: 12 }}>
                  <TrendingUp size={18} style={{ color: 'var(--red)' }} />
                  <strong>Periodo activo</strong>
                </div>
                <p className="muted">
                  {d.periodName || d.periodo || '2da Julio 2026'} · nómina en proceso.
                  Consulta el módulo de Periodos para la exportación NOI.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
