import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Calidad' }

export default function CalidadPage() {
  const inspecciones = [
    { id: 'INS-2026-0042', rollo: 'R-2026-00128', producto: 'Malla sombra 50%', resultado: 'APROBADO', inspector: 'Ana Calidad', fecha: new Date() },
    { id: 'INS-2026-0041', rollo: 'R-2026-00127', producto: 'Antiáfidos 50x25', resultado: 'APROBADO', inspector: 'Ana Calidad', fecha: new Date() },
    { id: 'INS-2026-0040', rollo: 'R-2026-00126', producto: 'Cubre suelos 100g', resultado: 'RETRABAJO', inspector: 'Pedro QA', fecha: new Date() },
    { id: 'INS-2026-0039', rollo: 'R-2026-00125', producto: 'Manta térmica 17g', resultado: 'RECHAZADO', inspector: 'Pedro QA', fecha: new Date(Date.now() - 86400000) },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Calidad</h1>
        <p className="page-subtitle">Inspección y liberación de rollos para entrega.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-mallatex-green-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-mallatex-green-700" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-mallatex-soil-500">Aprobados (mes)</div>
              <div className="text-2xl font-bold">186</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-mallatex-sun-300/40 p-2.5">
              <RefreshCw className="h-5 w-5 text-mallatex-sun-700" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-mallatex-soil-500">Retrabajo</div>
              <div className="text-2xl font-bold">9</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5">
              <XCircle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-mallatex-soil-500">Rechazados</div>
              <div className="text-2xl font-bold">3</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Checklist por familia" subtitle="Define los puntos de inspección" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { familia: 'Malla sombra', puntos: ['Gramaje en rangos', '% sombra medida', 'Resistencia al desgarro', 'Color uniforme', 'UV verificado'] },
            { familia: 'Antiáfidos', puntos: ['Densidad de hilos correcta', 'Sin perforaciones', 'Cristalinidad', 'Ancho dentro de tolerancia'] },
            { familia: 'Cubre suelos', puntos: ['Permeabilidad', 'Gramaje', 'Bordes termoseillados'] },
            { familia: 'Manta térmica', puntos: ['Gramaje', 'Resistencia al rasgado', 'Sin pliegues defectuosos'] },
          ].map((c) => (
            <div key={c.familia} className="rounded-lg border border-mallatex-soil-200 p-3">
              <h4 className="font-semibold text-mallatex-soil-900">{c.familia}</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {c.puntos.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-mallatex-soil-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-mallatex-green-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <CardHeader title="Últimas inspecciones" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">ID</th>
                <th className="px-5 py-2 font-medium">Rollo</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium">Inspector</th>
                <th className="px-5 py-2 font-medium">Fecha</th>
                <th className="px-5 py-2 font-medium">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {inspecciones.map((i) => (
                <tr key={i.id} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{i.id}</td>
                  <td className="px-5 py-3 font-mono text-xs text-mallatex-green-700">{i.rollo}</td>
                  <td className="px-5 py-3">{i.producto}</td>
                  <td className="px-5 py-3">{i.inspector}</td>
                  <td className="px-5 py-3">{formatDate(i.fecha)}</td>
                  <td className="px-5 py-3">
                    <Badge
                      className={
                        i.resultado === 'APROBADO'
                          ? 'bg-mallatex-green-100 text-mallatex-green-800'
                          : i.resultado === 'RETRABAJO'
                            ? 'bg-mallatex-sun-300/40 text-mallatex-sun-700'
                            : 'bg-red-100 text-red-700'
                      }
                    >
                      {i.resultado}
                    </Badge>
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
