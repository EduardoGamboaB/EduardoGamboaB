import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Warehouse } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Pedidos de Almacén' }

const PEDIDOS_ALMACEN = [
  {
    folio: 'PA-2026-00128',
    pedidoCliente: '183674',
    fecha: new Date('2026-04-21'),
    vendedor: 'Víctor Esteban',
    solicito: 'Carlos Aguilera',
    entrego: 'Alberto Olivares',
    estado: 'ENTREGADO',
    partidas: [
      { codigo: 'CUNEGRO105GR', desc: 'Cubresuelo Negro 105GR', unidad: 'M²', cantidad: 137060, medida: '7.70×100', rollos: 178 },
    ],
  },
  {
    folio: 'PA-2026-00129',
    pedidoCliente: 'VFGC-872',
    fecha: new Date('2026-05-15'),
    vendedor: 'Víctor Esteban',
    solicito: 'Carlos Aguilera',
    entrego: 'Alberto Olivares',
    estado: 'ENTREGADO_PARCIAL',
    partidas: [
      { codigo: 'RASCHEL35BLANCA', desc: 'Raschel 35% Blanca', unidad: 'M lineal', cantidad: 740, medida: '4.10×74', rollos: 10 },
    ],
  },
  {
    folio: 'PA-2026-00130',
    pedidoCliente: 'EZE-503',
    fecha: new Date('2026-05-17'),
    vendedor: 'Víctor Esteban',
    solicito: 'Carlos Aguilera',
    entrego: '—',
    estado: 'PENDIENTE',
    partidas: [
      { codigo: 'ANTIGRANIZONEGRA', desc: 'Antigranizo negra', unidad: 'M lineal', cantidad: 558, medida: '2.08×46.5', rollos: 12 },
    ],
  },
]

export default function PedidosAlmacenPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Pedidos de Almacén</h1>
          <p className="page-subtitle">Solicitudes internas SOLICITO → ENTREGO · formato corporativo Mallatex.</p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo pedido de almacén
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PEDIDOS_ALMACEN.map((p) => (
          <Card key={p.folio}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Warehouse className="h-4 w-4 text-mallatex-green-700" />
                  <span className="font-mono text-xs font-semibold text-mallatex-green-700">{p.folio}</span>
                </div>
                <p className="mt-1 text-sm text-mallatex-soil-500">
                  Pedido cliente <span className="font-mono">{p.pedidoCliente}</span>
                </p>
              </div>
              <Badge estado={p.estado} />
            </div>

            <dl className="mt-3 text-xs space-y-1">
              <div className="flex justify-between"><dt className="text-mallatex-soil-500">Fecha:</dt><dd>{formatDate(p.fecha)}</dd></div>
              <div className="flex justify-between"><dt className="text-mallatex-soil-500">Vendedor:</dt><dd>{p.vendedor}</dd></div>
              <div className="flex justify-between"><dt className="text-mallatex-soil-500">Solicitó:</dt><dd className="font-medium">{p.solicito}</dd></div>
              <div className="flex justify-between"><dt className="text-mallatex-soil-500">Entregó:</dt><dd className="font-medium">{p.entrego}</dd></div>
            </dl>

            <hr className="my-3 border-mallatex-soil-200" />

            <div className="space-y-2">
              {p.partidas.map((pt, i) => (
                <div key={i} className="rounded-lg bg-mallatex-soil-50 p-2.5 text-xs">
                  <div className="font-mono font-semibold text-mallatex-soil-900">{pt.codigo}</div>
                  <div className="text-mallatex-soil-700">{pt.desc}</div>
                  <div className="mt-1 grid grid-cols-3 gap-1 text-[11px]">
                    <span><span className="text-mallatex-soil-500">Cant:</span> <strong>{formatNumber(pt.cantidad)}</strong></span>
                    <span><span className="text-mallatex-soil-500">Med:</span> {pt.medida}</span>
                    <span><span className="text-mallatex-soil-500">Rollos:</span> {pt.rollos}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
