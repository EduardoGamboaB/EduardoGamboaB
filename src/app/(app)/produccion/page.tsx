import Link from 'next/link'
import { Factory, Plus, Pause, Play, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Producción' }

const ORDENES = [
  {
    folio: 'OP-2026-00001',
    pedido: 'PED-2026-00001',
    producto: 'Malla sombra 50% negra 4.20m',
    maquina: 'TEL-01',
    operario: 'María Operaria',
    turno: 'Matutino',
    plan: 1000,
    producido: 420,
    merma: 8,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
  },
  {
    folio: 'OP-2026-00002',
    pedido: 'PED-2026-00002',
    producto: 'Antiáfidos 50x25 3.00m',
    maquina: 'TEL-02',
    operario: 'José Pérez',
    turno: 'Matutino',
    plan: 2400,
    producido: 1880,
    merma: 12,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
  },
  {
    folio: 'OP-2026-00003',
    pedido: 'PED-2026-00003',
    producto: 'Cubre suelos 100 g/m² 4.20m',
    maquina: 'TEJ-01',
    operario: 'Luis Hernández',
    turno: 'Matutino',
    plan: 5200,
    producido: 780,
    merma: 5,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
  },
  {
    folio: 'OP-2026-00004',
    pedido: '—',
    producto: 'Manta térmica 17 g/m² 4.20m',
    maquina: 'EXT-01',
    operario: '—',
    turno: '—',
    plan: 800,
    producido: 0,
    merma: 0,
    estado: 'PENDIENTE',
    fechaPlan: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
]

export default function ProduccionPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Producción</h1>
          <p className="page-subtitle">Órdenes activas y planificadas en planta.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/produccion/registro" className="btn-primary">
            <Factory className="h-4 w-4" />
            Registrar producción
          </Link>
        </div>
      </div>

      {/* Cinta de máquinas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { codigo: 'TEL-01', estado: 'Activa', producto: 'Malla sombra 50%', oee: 82 },
          { codigo: 'TEL-02', estado: 'Activa', producto: 'Antiáfidos 50x25', oee: 76 },
          { codigo: 'TEJ-01', estado: 'Activa', producto: 'Cubre suelos', oee: 71 },
          { codigo: 'EXT-01', estado: 'Mantenimiento', producto: '—', oee: 0 },
          { codigo: 'COR-01', estado: 'Detenida', producto: '—', oee: 0 },
        ].map((m) => (
          <Card key={m.codigo} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-mallatex-soil-500">{m.codigo}</span>
              <span
                className={
                  'h-2 w-2 rounded-full ' +
                  (m.estado === 'Activa'
                    ? 'bg-mallatex-green-500 animate-pulse'
                    : m.estado === 'Mantenimiento'
                      ? 'bg-mallatex-sun-500'
                      : 'bg-mallatex-soil-300')
                }
              />
            </div>
            <p className="mt-2 text-xs text-mallatex-soil-700 truncate">{m.producto}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-2xl font-bold text-mallatex-soil-900">{m.oee}%</span>
              <span className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">OEE</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Lista de órdenes — responsive */}
      <Card className="p-0 overflow-hidden">
        <CardHeader title="Órdenes de producción" subtitle="Operación en curso y por iniciar" />

        <ul className="divide-y divide-mallatex-soil-200/60">
          {ORDENES.map((op) => {
            const pct = Math.round((op.producido / op.plan) * 100)
            return (
              <li key={op.folio} className="p-4 sm:p-5 hover:bg-mallatex-soil-50/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-mallatex-green-700">{op.folio}</span>
                      <Badge estado={op.estado} />
                      <Badge className="bg-mallatex-sky-300/30 text-mallatex-sky-700">{op.maquina}</Badge>
                    </div>
                    <h3 className="mt-1 font-semibold text-mallatex-soil-900 truncate">{op.producto}</h3>
                    <div className="mt-1 text-xs text-mallatex-soil-500 flex flex-wrap gap-x-3">
                      <span>Pedido: <span className="font-mono">{op.pedido}</span></span>
                      <span>Operario: {op.operario}</span>
                      <span>Turno: {op.turno}</span>
                      <span>Plan: {formatDate(op.fechaPlan)}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 sm:min-w-[220px]">
                    <div className="flex justify-between sm:justify-end sm:gap-4 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">Producido</div>
                        <div className="font-semibold">{formatNumber(op.producido)} / {formatNumber(op.plan)} m</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">Merma</div>
                        <div className="font-semibold text-red-600">{op.merma} m</div>
                      </div>
                    </div>
                    <div className="w-full sm:w-48 h-2 rounded-full bg-mallatex-soil-100 overflow-hidden">
                      <div className="h-full bg-mallatex-green-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 sm:flex-col">
                    {op.estado === 'EN_PROCESO' ? (
                      <button className="btn-secondary text-xs flex-1 sm:flex-none">
                        <Pause className="h-3.5 w-3.5" /> Pausar
                      </button>
                    ) : (
                      <button className="btn-primary text-xs flex-1 sm:flex-none">
                        <Play className="h-3.5 w-3.5" /> Iniciar
                      </button>
                    )}
                    <Link
                      href={`/produccion/registro?op=${op.folio}`}
                      className="btn-secondary text-xs flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Registrar
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
