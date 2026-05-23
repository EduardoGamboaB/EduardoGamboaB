import { Card, CardHeader } from '@/components/ui/Card'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { ProductionChart } from '@/components/modules/ProductionChart'

export const metadata = { title: 'Reportes' }

export default function ReportesPage() {
  const reportes = [
    {
      titulo: 'Producción por periodo',
      descripcion: 'Metros producidos por familia, máquina y operario.',
      icon: FileSpreadsheet,
    },
    {
      titulo: 'OEE planta',
      descripcion: 'Disponibilidad × Rendimiento × Calidad por máquina.',
      icon: FileSpreadsheet,
    },
    {
      titulo: 'Costos por orden',
      descripcion: 'Materia prima + mano de obra + indirectos por OP.',
      icon: FileText,
    },
    {
      titulo: 'Mermas y desperdicios',
      descripcion: 'Análisis de mermas por máquina, turno y producto.',
      icon: FileSpreadsheet,
    },
    {
      titulo: 'Trazabilidad de rollo',
      descripcion: 'Histórico completo desde MP hasta entrega al cliente.',
      icon: FileText,
    },
    {
      titulo: 'Cumplimiento de entregas',
      descripcion: 'On-time delivery por cliente y periodo.',
      icon: FileSpreadsheet,
    },
  ]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">Genera reportes operativos y de gestión.</p>
      </div>

      {/* Filtros de rango */}
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" />
          </div>
          <div>
            <label className="label">Máquina</label>
            <select className="input">
              <option>Todas</option>
              <option>TEL-01</option>
              <option>TEL-02</option>
              <option>EXT-01</option>
              <option>TEJ-01</option>
            </select>
          </div>
          <div>
            <label className="label">Familia</label>
            <select className="input">
              <option>Todas</option>
              <option>Malla sombra</option>
              <option>Antiáfidos</option>
              <option>Cubre suelos</option>
              <option>Manta térmica</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Gráfica */}
      <Card>
        <CardHeader
          title="Producción últimos 7 días"
          subtitle="Metros lineales por familia"
          action={
            <button className="btn-secondary text-xs">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          }
        />
        <ProductionChart />
      </Card>

      {/* Catálogo de reportes */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reportes.map((r) => (
          <Card key={r.titulo} className="hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-mallatex-green-100 p-2.5">
                <r.icon className="h-5 w-5 text-mallatex-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-mallatex-soil-900">{r.titulo}</h3>
                <p className="text-xs text-mallatex-soil-500 mt-0.5">{r.descripcion}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary text-xs flex-1">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
              <button className="btn-secondary text-xs flex-1">
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
