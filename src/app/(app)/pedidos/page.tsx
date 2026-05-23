import Link from 'next/link'
import { Plus, Filter, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'

export const metadata = { title: 'Pedidos' }

// Datos demo — en producción: const pedidos = await db.pedido.findMany(...)
const PEDIDOS = [
  {
    folio: 'PED-2026-00001',
    cliente: 'Invernaderos del Bajío',
    productos: 'Malla sombra 50% · 1000 m',
    fechaCompromiso: new Date('2026-06-05'),
    estado: 'EN_PRODUCCION',
    total: 18500,
    avance: 42,
  },
  {
    folio: 'PED-2026-00002',
    cliente: 'Agrícola Hortícola Culiacán',
    productos: 'Antiáfidos 50x25 · 2400 m · Manta térmica · 800 m',
    fechaCompromiso: new Date('2026-06-12'),
    estado: 'CONFIRMADO',
    total: 116640,
    avance: 0,
  },
  {
    folio: 'PED-2026-00003',
    cliente: 'Berries La Montaña',
    productos: 'Cubre suelos 100 g · 5200 m²',
    fechaCompromiso: new Date('2026-05-30'),
    estado: 'EN_PRODUCCION',
    total: 65000,
    avance: 78,
  },
  {
    folio: 'PED-2026-00004',
    cliente: 'Invernaderos del Bajío',
    productos: 'Antigranizo 12g · 1800 m',
    fechaCompromiso: new Date('2026-06-20'),
    estado: 'BORRADOR',
    total: 57600,
    avance: 0,
  },
  {
    folio: 'PED-2025-01987',
    cliente: 'Agrícola Hortícola Culiacán',
    productos: 'Malla sombra 70% · 3500 m',
    fechaCompromiso: new Date('2026-05-10'),
    estado: 'ENTREGADO',
    total: 84000,
    avance: 100,
  },
]

export default function PedidosPage() {
  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Pedidos</h1>
          <p className="page-subtitle">Gestiona los pedidos de agrotextiles de tus clientes.</p>
        </div>
        <Link href="/pedidos/nuevo" className="btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo pedido
        </Link>
      </div>

      {/* Filtros */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mallatex-soil-500" />
            <input
              type="search"
              placeholder="Buscar por folio, cliente o producto…"
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:flex-wrap">
            {['Todos', 'Borrador', 'Confirmado', 'En producción', 'Terminado', 'Entregado'].map(
              (f, i) => (
                <button
                  key={f}
                  className={
                    i === 0
                      ? 'btn-primary whitespace-nowrap py-2 px-3 text-xs'
                      : 'btn-ghost whitespace-nowrap py-2 px-3 text-xs border border-mallatex-soil-200'
                  }
                >
                  {f}
                </button>
              ),
            )}
            <button className="btn-ghost py-2 px-3 text-xs border border-mallatex-soil-200">
              <Filter className="h-3.5 w-3.5" />
              Más
            </button>
          </div>
        </div>
      </Card>

      {/* Lista — tabla en desktop, cards en móvil */}
      <Card className="p-0 overflow-hidden">
        {/* Vista tabla (lg+) — en tablet usamos la vista de cards porque la tabla es ancha */}
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-mallatex-soil-50 text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
              <tr>
                <th className="px-5 py-3 font-medium">Folio</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Productos</th>
                <th className="px-5 py-3 font-medium">Compromiso</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
                <th className="px-5 py-3 font-medium">Avance</th>
              </tr>
            </thead>
            <tbody>
              {PEDIDOS.map((p) => (
                <tr
                  key={p.folio}
                  className="border-t border-mallatex-soil-200/60 hover:bg-mallatex-soil-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/pedidos/${p.folio}`}
                      className="font-mono text-xs text-mallatex-green-700 hover:underline"
                    >
                      {p.folio}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-medium">{p.cliente}</td>
                  <td className="px-5 py-3 text-mallatex-soil-700 max-w-xs truncate">{p.productos}</td>
                  <td className="px-5 py-3 text-mallatex-soil-700">{formatDate(p.fechaCompromiso)}</td>
                  <td className="px-5 py-3">
                    <Badge estado={p.estado} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium">{formatCurrency(p.total)}</td>
                  <td className="px-5 py-3 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                        <div
                          className="h-full bg-mallatex-green-600"
                          style={{ width: `${p.avance}%` }}
                        />
                      </div>
                      <span className="text-xs text-mallatex-soil-500 w-9 text-right">{p.avance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista cards (móvil + tablet) */}
        <ul className="lg:hidden divide-y divide-mallatex-soil-200/60">
          {PEDIDOS.map((p) => (
            <li key={p.folio}>
              <Link
                href={`/pedidos/${p.folio}`}
                className="block p-4 active:bg-mallatex-soil-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-mallatex-green-700">{p.folio}</div>
                    <div className="font-medium text-mallatex-soil-900 truncate">{p.cliente}</div>
                    <div className="mt-1 text-xs text-mallatex-soil-500 line-clamp-2">{p.productos}</div>
                  </div>
                  <Badge estado={p.estado} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-mallatex-soil-500">Entrega {formatDate(p.fechaCompromiso)}</span>
                  <span className="font-semibold">{formatCurrency(p.total)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-mallatex-soil-100 overflow-hidden">
                  <div className="h-full bg-mallatex-green-600" style={{ width: `${p.avance}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
