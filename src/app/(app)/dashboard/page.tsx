import { Factory, ClipboardList, Boxes, AlertTriangle, TrendingUp, Gauge } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProductionChart } from '@/components/modules/ProductionChart'
import { formatNumber } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  // En producción estos datos vienen de la BD vía Server Components
  const kpis = {
    pedidosActivos: 18,
    metrosHoy: 4_280,
    metrosSemana: 28_650,
    oee: 78,
    pedidosAtrasados: 2,
    stockCritico: 3,
  }

  const ordenesActivas = [
    { folio: 'OP-2026-00001', producto: 'Malla sombra 50% negra 4.20m', maquina: 'TEL-01', avance: 42, prioridad: 'Alta' },
    { folio: 'OP-2026-00002', producto: 'Malla antiáfidos 50x25 3.00m', maquina: 'TEL-02', avance: 78, prioridad: 'Media' },
    { folio: 'OP-2026-00003', producto: 'Cubre suelos 100 g/m² 4.20m', maquina: 'TEJ-01', avance: 15, prioridad: 'Alta' },
    { folio: 'OP-2026-00004', producto: 'Manta térmica 17 g/m² 4.20m', maquina: 'EXT-01', avance: 90, prioridad: 'Baja' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Panel de control</h1>
        <p className="page-subtitle">Visión general de la planta — hoy, 09:42</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KPICard
          label="Pedidos activos"
          value={kpis.pedidosActivos}
          hint="En producción o por confirmar"
          icon={ClipboardList}
          tone="green"
          trend={{ value: 12, positive: true }}
        />
        <KPICard
          label="Metros producidos hoy"
          value={formatNumber(kpis.metrosHoy)}
          hint={`Semana: ${formatNumber(kpis.metrosSemana)} m`}
          icon={Factory}
          tone="sun"
          trend={{ value: 8, positive: true }}
        />
        <KPICard
          label="OEE planta"
          value={`${kpis.oee}%`}
          hint="Disp · Rend · Calidad"
          icon={Gauge}
          tone="sky"
          trend={{ value: 3, positive: true }}
        />
        <KPICard
          label="Alertas"
          value={kpis.pedidosAtrasados + kpis.stockCritico}
          hint={`${kpis.pedidosAtrasados} atrasos · ${kpis.stockCritico} stock`}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Producción 7 días */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Producción últimos 7 días"
            subtitle="Metros lineales por familia de producto"
            action={
              <Badge className="bg-mallatex-green-100 text-mallatex-green-800">
                <TrendingUp className="h-3 w-3" /> +8.4%
              </Badge>
            }
          />
          <ProductionChart />
        </Card>

        {/* Stock crítico */}
        <Card>
          <CardHeader title="Stock crítico" subtitle="Materias primas bajo mínimo" />
          <ul className="space-y-3">
            {[
              { item: 'Masterbatch verde', actual: 95, min: 150, unidad: 'kg' },
              { item: 'Aditivo UV', actual: 140, min: 200, unidad: 'kg' },
              { item: 'HDPE virgen', actual: 1850, min: 2000, unidad: 'kg' },
            ].map((s) => {
              const ratio = (s.actual / s.min) * 100
              return (
                <li key={s.item}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-mallatex-soil-900">{s.item}</span>
                    <span className="text-mallatex-soil-500">
                      {formatNumber(s.actual)} / {formatNumber(s.min)} {s.unidad}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(ratio, 100)}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      {/* Órdenes activas */}
      <Card>
        <CardHeader title="Órdenes de producción activas" subtitle="Vista por máquina" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">Folio</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium">Máquina</th>
                <th className="px-5 py-2 font-medium">Prioridad</th>
                <th className="px-5 py-2 font-medium w-48">Avance</th>
              </tr>
            </thead>
            <tbody>
              {ordenesActivas.map((o) => (
                <tr key={o.folio} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{o.folio}</td>
                  <td className="px-5 py-3">{o.producto}</td>
                  <td className="px-5 py-3">
                    <Badge className="bg-mallatex-sky-300/30 text-mallatex-sky-700">
                      {o.maquina}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      className={
                        o.prioridad === 'Alta'
                          ? 'bg-red-100 text-red-700'
                          : o.prioridad === 'Media'
                            ? 'bg-mallatex-sun-300/40 text-mallatex-sun-700'
                            : 'bg-mallatex-soil-100 text-mallatex-soil-700'
                      }
                    >
                      {o.prioridad}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                        <div
                          className="h-full bg-mallatex-green-600 rounded-full"
                          style={{ width: `${o.avance}%` }}
                        />
                      </div>
                      <span className="text-xs text-mallatex-soil-700 w-9 text-right">{o.avance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
