import Link from 'next/link'
import { ArrowLeft, Calendar, User, FileText, Factory } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata = { title: 'Detalle de pedido' }

export default function PedidoDetallePage({ params }: { params: { folio: string } }) {
  // En producción: const pedido = await db.pedido.findUnique({ where: { folio }, include: { items, ordenes, cliente } })
  const pedido = {
    folio: params.folio,
    cliente: 'Invernaderos del Bajío S.A. de C.V.',
    rfc: 'INA980515ABC',
    contacto: 'Ing. Juan Pérez · 477-123-4567',
    fechaPedido: new Date('2026-05-15'),
    fechaCompromiso: new Date('2026-06-05'),
    estado: 'EN_PRODUCCION',
    total: 18500,
    comercial: 'Eduardo Gamboa',
    notas: 'Entregar en planta del cliente. Confirmar acceso de tráiler.',
    items: [
      {
        sku: 'MS-50-N-420',
        producto: 'Malla sombra 50% negra 4.20m',
        especs: '4.20m · 80 g/m² · UV 5 años',
        cantidad: 1000,
        unidad: 'm',
        producido: 420,
        precio: 18.5,
      },
    ],
    ordenes: [
      {
        folio: 'OP-2026-00001',
        maquina: 'TEL-01',
        estado: 'EN_PROCESO',
        avance: 42,
      },
    ],
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <Link
          href="/pedidos"
          className="p-2 -ml-2 rounded-lg hover:bg-mallatex-soil-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-mallatex-green-700">{pedido.folio}</span>
            <Badge estado={pedido.estado} />
          </div>
          <h1 className="page-title">{pedido.cliente}</h1>
          <p className="page-subtitle">
            Pedido del {formatDate(pedido.fechaPedido)} · Entrega {formatDate(pedido.fechaCompromiso)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary text-xs">Imprimir orden</button>
          <button className="btn-primary text-xs">Generar OP</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Cliente */}
        <Card>
          <CardHeader title="Cliente" />
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <FileText className="h-4 w-4 text-mallatex-soil-500 mt-0.5" />
              <div>
                <dt className="text-xs text-mallatex-soil-500">RFC</dt>
                <dd className="font-mono">{pedido.rfc}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <User className="h-4 w-4 text-mallatex-soil-500 mt-0.5" />
              <div>
                <dt className="text-xs text-mallatex-soil-500">Contacto</dt>
                <dd>{pedido.contacto}</dd>
              </div>
            </div>
            <div className="flex gap-2">
              <User className="h-4 w-4 text-mallatex-soil-500 mt-0.5" />
              <div>
                <dt className="text-xs text-mallatex-soil-500">Comercial</dt>
                <dd>{pedido.comercial}</dd>
              </div>
            </div>
          </dl>
        </Card>

        {/* Resumen */}
        <Card>
          <CardHeader title="Resumen" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-mallatex-soil-500">Partidas</dt>
              <dd className="font-medium">{pedido.items.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mallatex-soil-500">Cantidad total</dt>
              <dd className="font-medium">
                {pedido.items.reduce((a, i) => a + i.cantidad, 0)} m
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-mallatex-soil-500">Producido</dt>
              <dd className="font-medium">
                {pedido.items.reduce((a, i) => a + i.producido, 0)} m
              </dd>
            </div>
            <div className="flex justify-between pt-2 border-t border-mallatex-soil-200 mt-2">
              <dt className="text-mallatex-soil-700 font-medium">Total</dt>
              <dd className="font-bold">{formatCurrency(pedido.total)}</dd>
            </div>
          </dl>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader title="Notas internas" />
          <p className="text-sm text-mallatex-soil-700">{pedido.notas}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-mallatex-soil-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>Última actualización hace 2h</span>
          </div>
        </Card>
      </div>

      {/* Partidas */}
      <Card>
        <CardHeader title="Partidas del pedido" subtitle="Productos solicitados y avance" />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr className="border-b border-mallatex-soil-200">
                <th className="px-5 py-2 font-medium">SKU</th>
                <th className="px-5 py-2 font-medium">Producto</th>
                <th className="px-5 py-2 font-medium">Especificaciones</th>
                <th className="px-5 py-2 font-medium text-right">Cantidad</th>
                <th className="px-5 py-2 font-medium text-right">Producido</th>
                <th className="px-5 py-2 font-medium text-right">P. unitario</th>
                <th className="px-5 py-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {pedido.items.map((item) => (
                <tr key={item.sku} className="border-b border-mallatex-soil-200/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-5 py-3 font-medium">{item.producto}</td>
                  <td className="px-5 py-3 text-mallatex-soil-700 text-xs">{item.especs}</td>
                  <td className="px-5 py-3 text-right">{item.cantidad} {item.unidad}</td>
                  <td className="px-5 py-3 text-right text-mallatex-green-700 font-medium">
                    {item.producido} {item.unidad}
                  </td>
                  <td className="px-5 py-3 text-right">{formatCurrency(item.precio)}</td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {formatCurrency(item.cantidad * item.precio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Órdenes de producción asociadas */}
      <Card>
        <CardHeader title="Órdenes de producción" subtitle="Trabajo en planta asociado" />
        <ul className="space-y-2">
          {pedido.ordenes.map((op) => (
            <li
              key={op.folio}
              className="flex items-center gap-3 p-3 rounded-lg border border-mallatex-soil-200 hover:bg-mallatex-soil-50/50"
            >
              <div className="h-10 w-10 rounded-lg bg-mallatex-green-100 flex items-center justify-center">
                <Factory className="h-5 w-5 text-mallatex-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-mallatex-green-700">{op.folio}</span>
                  <Badge estado={op.estado} />
                </div>
                <div className="text-sm text-mallatex-soil-700">Máquina {op.maquina}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{op.avance}%</div>
                <div className="w-24 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden mt-1">
                  <div
                    className="h-full bg-mallatex-green-600"
                    style={{ width: `${op.avance}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
