import { Factory, ClipboardList, AlertTriangle, TrendingUp, Gauge, Truck } from 'lucide-react'
import { KPICard } from '@/components/ui/KPICard'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProductionChart } from '@/components/modules/ProductionChart'
import { formatNumber } from '@/lib/utils'

export const metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  const kpis = {
    pedidosActivos: 14,
    metrosHoy: 5_840,
    metrosSemana: 32_180,
    oee: 81,
    pedidosAtrasados: 2,
    stockCritico: 3,
    montacargasOk: 2,
  }

  const lineas = [
    { codigo: 'LC1', nombre: 'Costura 1',   operario: 'Karen',         producto: 'Cubresuelo Negro',   avance: 56 },
    { codigo: 'LC2', nombre: 'Costura 2',   operario: 'Lorena',        producto: 'Antigranizo Blanca', avance: 38 },
    { codigo: 'LC3', nombre: 'Costura 3',   operario: 'Jesús',         producto: 'Raschel 35% Blanca', avance: 72 },
    { codigo: 'LK',  nombre: 'Corte',       operario: 'Erik',          producto: 'Antigranizo Negra',  avance: 91 },
    { codigo: 'LP',  nombre: 'Perforadora', operario: 'Carmen / Pao',  producto: 'Cubresuelo Azorrillado', avance: 24 },
  ]

  const ordenesActivas = [
    { folio: 'OP-2026-00128', pedido: 'VFGC-872',  producto: 'Raschel 35% Blanca 4.10×74',         linea: 'LC3', operario: 'Lorena', avance: 72, prioridad: 'Alta' },
    { folio: 'OP-2026-00131', pedido: '183674',    producto: 'Cubresuelo Negro 105 GR 7.70×100',    linea: 'LK',  operario: 'Erik',   avance: 41, prioridad: 'Alta' },
    { folio: 'OP-2026-00133', pedido: 'EZE-503',   producto: 'Antigranizo Negra 2.08×46.5',         linea: 'LC1', operario: 'Karen',  avance: 56, prioridad: 'Media' },
    { folio: 'OP-2026-00134', pedido: 'P.FEL-10',  producto: 'Antiáfido 22/12 cristal 4.50×587',     linea: 'LC2', operario: 'Lorena', avance: 38, prioridad: 'Alta' },
    { folio: 'OP-2026-00136', pedido: 'VEG-1082',  producto: 'Cubresuelo Azorrillado 1.80×500 perf.', linea: 'LP', operario: 'Carmen', avance: 24, prioridad: 'Media' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Panel de control</h1>
        <p className="page-subtitle">Visión general de la planta · hoy 09:42 · 5 líneas activas</p>
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
          hint={`${kpis.pedidosAtrasados} atrasos · ${kpis.stockCritico} stock bajo`}
          icon={AlertTriangle}
          tone="red"
        />
      </div>

      {/* Líneas de producción (cinta) */}
      <Card>
        <CardHeader title="Líneas de producción" subtitle="Tablero en vivo · Turno matutino (06:00–14:00)" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {lineas.map((l) => (
            <div key={l.codigo} className="rounded-lg border border-mallatex-soil-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-mallatex-green-700">{l.codigo}</span>
                <span className="h-2 w-2 rounded-full bg-mallatex-green-500 animate-pulse" />
              </div>
              <p className="mt-1 text-sm font-semibold text-mallatex-soil-900">{l.nombre}</p>
              <p className="mt-0.5 text-[11px] text-mallatex-soil-500 truncate" title={l.producto}>{l.producto}</p>
              <p className="mt-1 text-[11px] text-mallatex-soil-700">👤 {l.operario}</p>
              <div className="mt-2 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                <div className="h-full bg-mallatex-green-600" style={{ width: `${l.avance}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-right font-semibold text-mallatex-soil-700">{l.avance}%</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Producción últimos 7 días"
            subtitle="Metros producidos por familia"
            action={
              <Badge className="bg-mallatex-green-100 text-mallatex-green-800">
                <TrendingUp className="h-3 w-3" /> +8.4%
              </Badge>
            }
          />
          <ProductionChart />
        </Card>

        <Card>
          <CardHeader title="Stock crítico" subtitle="Materias primas bajo mínimo" />
          <ul className="space-y-3">
            {[
              { item: 'Masterbatch verde', actual: 95,  min: 150, unidad: 'kg' },
              { item: 'Aditivo UV',        actual: 140, min: 200, unidad: 'kg' },
              { item: 'HDPE virgen',       actual: 1850, min: 2000, unidad: 'kg' },
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
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(ratio, 100)}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
          <hr className="my-3 border-mallatex-soil-200" />
          <div className="flex items-center gap-2 text-xs text-mallatex-soil-700">
            <Truck className="h-4 w-4 text-mallatex-green-700" />
            <span>{kpis.montacargasOk}/2 montacargas con check-list al día.</span>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Órdenes de producción activas" subtitle="Vista por línea" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">OP</th>
                <th className="px-5 py-2 font-medium">Pedido</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium">Línea</th>
                <th className="px-5 py-2 font-medium">Operario</th>
                <th className="px-5 py-2 font-medium">Prioridad</th>
                <th className="px-5 py-2 font-medium w-40">Avance</th>
              </tr>
            </thead>
            <tbody>
              {ordenesActivas.map((o) => (
                <tr key={o.folio} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{o.folio}</td>
                  <td className="px-5 py-3 font-mono text-xs text-mallatex-green-700">{o.pedido}</td>
                  <td className="px-5 py-3">{o.producto}</td>
                  <td className="px-5 py-3">
                    <Badge className="bg-mallatex-sky-300/30 text-mallatex-sky-700">{o.linea}</Badge>
                  </td>
                  <td className="px-5 py-3 text-mallatex-soil-700">{o.operario}</td>
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
                        <div className="h-full bg-mallatex-green-600" style={{ width: `${o.avance}%` }} />
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
