import { Card, CardHeader } from '@/components/ui/Card'
import { Plus, Search } from 'lucide-react'
import { cn, categoriaMpColor, categoriaMpLabel, formatDate, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Control MP en Producción' }

const REGISTROS = [
  { fecha: new Date('2026-04-29'), material: 'Cubresuelo Negro', medida: '3.30×1391.72', linea: 'LC1', lote: '4368', categoria: 'EXCEDENTE',  cantidad: 30.10, obs: '350 m sobrantes en rollo' },
  { fecha: new Date('2026-04-29'), material: 'Cubresuelo Negro', medida: '3.30×419.14',  linea: 'LC1', lote: '2731', categoria: 'DEFECTO',    cantidad: 2.0,   obs: 'Hilo flojo en orillo' },
  { fecha: new Date('2026-04-29'), material: 'Cubresuelo Negro', medida: '3.30×1501.94', linea: 'LC1', lote: '39180', categoria: 'FALTANTE',  cantidad: 13,    obs: 'Faltó vs. plan' },
  { fecha: new Date('2026-04-30'), material: 'Cubresuelo Negro', medida: '3.30×2098.26', linea: 'LC1', lote: '3049', categoria: 'SOBRANTE',   cantidad: 1.0,   obs: 'Queda en línea' },
  { fecha: new Date('2026-05-01'), material: 'Cubresuelo Verde', medida: '3.30×1736.42', linea: 'LC1', lote: '4368', categoria: 'DESPERDICIO', cantidad: 1.0,  obs: 'Sin aprovechar' },
  { fecha: new Date('2026-05-04'), material: 'Cubresuelo Negro', medida: '3.30×146.31',  linea: 'LC1', lote: '304',  categoria: 'DEFECTO',    cantidad: 2.0,   obs: 'Mancha por aceite' },
  { fecha: new Date('2026-05-04'), material: 'Antigranizo Negra', medida: '3.70×300',    linea: 'LK',  lote: '4068', categoria: 'EXCEDENTE',  cantidad: 14,    obs: 'Corte sobró rollo' },
]

export default function ControlMpPage() {
  const tot: Record<string, number> = { EXCEDENTE: 0, DEFECTO: 0, FALTANTE: 0, SOBRANTE: 0, DESPERDICIO: 0 }
  for (const r of REGISTROS) tot[r.categoria] = (tot[r.categoria] ?? 0) + r.cantidad

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Control MP en Producción</h1>
          <p className="page-subtitle">Formato MT-DT-003-2026 · trazabilidad por lote y línea.</p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo registro
        </button>
      </div>

      {/* Resumen por categoría */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(['EXCEDENTE', 'DEFECTO', 'FALTANTE', 'SOBRANTE', 'DESPERDICIO'] as const).map((c) => (
          <Card key={c} className="p-4">
            <div className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium', categoriaMpColor(c))}>
              {categoriaMpLabel(c)}
            </div>
            <div className="mt-2 text-2xl font-bold">{formatNumber(tot[c], 1)} m</div>
            <div className="text-xs text-mallatex-soil-500">acumulado del mes</div>
          </Card>
        ))}
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mallatex-soil-500" />
            <input type="search" placeholder="Buscar por pedido, material, lote o línea…" className="input pl-10" />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:flex-wrap">
            <button className="btn-primary whitespace-nowrap py-2 px-3 text-xs">Todos</button>
            {['Excedente', 'Defecto', 'Faltante', 'Sobrante', 'Desperdicio'].map((c) => (
              <button key={c} className="btn-ghost whitespace-nowrap py-2 px-3 text-xs border border-mallatex-soil-200">{c}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {/* Tabla (lg+) */}
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-mallatex-soil-50 text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Material</th>
                <th className="px-5 py-3 font-medium">Medida</th>
                <th className="px-5 py-3 font-medium">Línea</th>
                <th className="px-5 py-3 font-medium">Lote</th>
                <th className="px-5 py-3 font-medium">Categoría</th>
                <th className="px-5 py-3 font-medium text-right">Cantidad</th>
                <th className="px-5 py-3 font-medium">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {REGISTROS.map((r, i) => (
                <tr key={i} className="border-t border-mallatex-soil-200/60">
                  <td className="px-5 py-3">{formatDate(r.fecha)}</td>
                  <td className="px-5 py-3 font-medium">{r.material}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.medida}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-mallatex-sky-300/30 text-mallatex-sky-700">{r.linea}</span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{r.lote}</td>
                  <td className="px-5 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium', categoriaMpColor(r.categoria))}>
                      {categoriaMpLabel(r.categoria)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNumber(r.cantidad, 1)} m</td>
                  <td className="px-5 py-3 text-mallatex-soil-700 text-xs">{r.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards (móvil + tablet) */}
        <ul className="lg:hidden divide-y divide-mallatex-soil-200/60">
          {REGISTROS.map((r, i) => (
            <li key={i} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-mallatex-soil-500">{formatDate(r.fecha)} · Línea {r.linea} · Lote {r.lote}</p>
                  <p className="font-semibold">{r.material}</p>
                  <p className="font-mono text-xs text-mallatex-soil-700">{r.medida}</p>
                </div>
                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap', categoriaMpColor(r.categoria))}>
                  {categoriaMpLabel(r.categoria)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-mallatex-soil-500 text-xs">{r.obs}</span>
                <span className="font-semibold">{formatNumber(r.cantidad, 1)} m</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
