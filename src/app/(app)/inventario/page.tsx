import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export const metadata = { title: 'Inventario' }

export default function InventarioPage() {
  const almacenes = [
    { codigo: 'ALM-MP', nombre: 'Materia prima',         items: 12, valorMxn: 845_000 },
    { codigo: 'ALM-PP', nombre: 'Producto en proceso',   items: 28, valorMxn: 312_000 },
    { codigo: 'ALM-PT', nombre: 'Producto terminado',    items: 47, valorMxn: 1_240_000 },
  ]

  const materias = [
    { codigo: 'MP-HDPE-V', nombre: 'HDPE virgen',          stock: 1850, min: 2000, unidad: 'kg' },
    { codigo: 'MP-PP-V',   nombre: 'Polipropileno virgen', stock: 2400, min: 1500, unidad: 'kg' },
    { codigo: 'MP-UV',     nombre: 'Aditivo UV',           stock: 140,  min: 200,  unidad: 'kg' },
    { codigo: 'MP-MB-N',   nombre: 'Masterbatch negro',    stock: 480,  min: 300,  unidad: 'kg' },
    { codigo: 'MP-MB-V',   nombre: 'Masterbatch verde',    stock: 95,   min: 150,  unidad: 'kg' },
  ]

  const terminados = [
    { sku: 'CUNEGRO105GR',         nombre: 'Cubresuelo Negro 105 GR 7.70×100',   rollos: 178, metros: 137060, lote: '6619' },
    { sku: 'CUAZORR105P70',        nombre: 'Cubresuelo Azorrillado 1.80×500',     rollos:  23, metros:  11500, lote: '4368' },
    { sku: 'RASCHEL35BLANCA',      nombre: 'Raschel 35% blanca 4.10×74',          rollos:  42, metros:   3108, lote: '4153' },
    { sku: 'ANTIGRANIZONEGRA',     nombre: 'Antigranizo negra 2.08×46.5',         rollos:  18, metros:    837, lote: '3049' },
    { sku: 'ANTIAFIDO12X22CRISTAL',nombre: 'Antiáfido 12×22 cristal 5.20×6',      rollos:  12, metros:     72, lote: '2731' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">MP por lote, producto en proceso y producto terminado.</p>
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

      <Card>
        <CardHeader title="Materia prima por lote" subtitle="Stock vs. nivel mínimo · trazabilidad por lote" />
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
                  <div className={`h-full rounded-full ${critico ? 'bg-red-500' : 'bg-mallatex-green-600'}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <CardHeader title="Producto terminado por lote" subtitle="Disponible para entrega" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">SKU</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium">Lote</th>
                <th className="px-5 py-2 font-medium text-right">Rollos</th>
                <th className="px-5 py-2 font-medium text-right">m / m²</th>
                <th className="px-5 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {terminados.map((t) => (
                <tr key={t.sku} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{t.sku}</td>
                  <td className="px-5 py-3 font-medium">{t.nombre}</td>
                  <td className="px-5 py-3 font-mono text-xs">{t.lote}</td>
                  <td className="px-5 py-3 text-right">{t.rollos}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatNumber(t.metros)}</td>
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
