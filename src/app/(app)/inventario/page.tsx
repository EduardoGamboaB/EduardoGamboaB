import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export const metadata = { title: 'Inventario' }

export default function InventarioPage() {
  const almacenes = [
    { codigo: 'ALM-MP', nombre: 'Materia prima', items: 12, valorMxn: 845_000 },
    { codigo: 'ALM-PP', nombre: 'Producto en proceso', items: 28, valorMxn: 312_000 },
    { codigo: 'ALM-PT', nombre: 'Producto terminado', items: 47, valorMxn: 1_240_000 },
  ]

  const materias = [
    { codigo: 'MP-HDPE-V', nombre: 'HDPE virgen', stock: 1850, min: 2000, unidad: 'kg' },
    { codigo: 'MP-PP-V', nombre: 'Polipropileno virgen', stock: 2400, min: 1500, unidad: 'kg' },
    { codigo: 'MP-UV', nombre: 'Aditivo UV', stock: 140, min: 200, unidad: 'kg' },
    { codigo: 'MP-MB-N', nombre: 'Masterbatch negro', stock: 480, min: 300, unidad: 'kg' },
    { codigo: 'MP-MB-V', nombre: 'Masterbatch verde', stock: 95, min: 150, unidad: 'kg' },
  ]

  const terminados = [
    { sku: 'MS-50-N-420', nombre: 'Malla sombra 50% negra 4.20m', rollos: 42, metros: 12_600 },
    { sku: 'MA-50x25-B-300', nombre: 'Antiáfidos 50x25 cristal 3.00m', rollos: 18, metros: 5_400 },
    { sku: 'CS-100-N-420', nombre: 'Cubre suelos 100g 4.20m', rollos: 23, metros: 9_200 },
    { sku: 'MT-17-B-420', nombre: 'Manta térmica 17g blanca 4.20m', rollos: 31, metros: 15_500 },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Stock de materia prima, proceso y producto terminado.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary">
            <ArrowUpFromLine className="h-4 w-4" /> Salida
          </button>
          <button className="btn-primary">
            <ArrowDownToLine className="h-4 w-4" /> Entrada
          </button>
        </div>
      </div>

      {/* Almacenes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {almacenes.map((a) => (
          <Card key={a.codigo}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-mallatex-soil-500">{a.codigo}</div>
                <div className="font-semibold text-mallatex-soil-900">{a.nombre}</div>
              </div>
              <div className="rounded-lg bg-mallatex-green-100 p-2">
                <Boxes className="h-5 w-5 text-mallatex-green-700" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold">{a.items}</span>
              <span className="text-xs text-mallatex-soil-500">SKUs</span>
            </div>
            <div className="text-xs text-mallatex-soil-500">
              Valor estimado: <span className="font-semibold text-mallatex-soil-800">${formatNumber(a.valorMxn)}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Materia prima */}
      <Card>
        <CardHeader title="Materia prima" subtitle="Stock vs. nivel mínimo" />
        <div className="space-y-3">
          {materias.map((m) => {
            const ratio = (m.stock / m.min) * 100
            const critico = m.stock < m.min
            return (
              <div key={m.codigo}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {critico && <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                    <span className="font-mono text-xs text-mallatex-soil-500">{m.codigo}</span>
                    <span className="font-medium truncate">{m.nombre}</span>
                  </div>
                  <span className={critico ? 'font-semibold text-red-600' : 'text-mallatex-soil-700'}>
                    {formatNumber(m.stock)} / {formatNumber(m.min)} {m.unidad}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${critico ? 'bg-red-500' : 'bg-mallatex-green-600'}`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Producto terminado */}
      <Card className="p-0 overflow-hidden">
        <CardHeader title="Producto terminado" subtitle="Listo para entregar" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">SKU</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium text-right">Rollos</th>
                <th className="px-5 py-2 font-medium text-right">Metros</th>
                <th className="px-5 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {terminados.map((t) => (
                <tr key={t.sku} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{t.sku}</td>
                  <td className="px-5 py-3 font-medium">{t.nombre}</td>
                  <td className="px-5 py-3 text-right">{t.rollos}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNumber(t.metros)} m</td>
                  <td className="px-5 py-3">
                    <Badge className="bg-mallatex-green-100 text-mallatex-green-800">Disponible</Badge>
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
