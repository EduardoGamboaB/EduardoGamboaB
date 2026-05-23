import Link from 'next/link'
import { Factory, Plus, Pause, Play, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatNumber } from '@/lib/utils'

export const metadata = { title: 'Producción' }

const LINEAS = [
  { codigo: 'LC1', nombre: 'Costura 1',   estado: 'Activa',         oee: 84, op: 'Cubresuelo Negro · Karen' },
  { codigo: 'LC2', nombre: 'Costura 2',   estado: 'Activa',         oee: 76, op: 'Antiáfido 22/12 · Lorena' },
  { codigo: 'LC3', nombre: 'Costura 3',   estado: 'Activa',         oee: 71, op: 'Raschel 35% · Jesús' },
  { codigo: 'LK',  nombre: 'Corte',       estado: 'Activa',         oee: 88, op: 'Antigranizo Negra · Erik' },
  { codigo: 'LP',  nombre: 'Perforadora', estado: 'Mantenimiento',  oee: 0,  op: '—' },
]

const ORDENES = [
  {
    folio: 'OP-2026-00128',
    pedido: 'VFGC-872',
    producto: 'Raschel 35% Blanca 4.10×74',
    linea: 'LC3',
    operario: 'Lorena',
    turno: 'Matutino',
    plan: 740,
    producido: 533,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
    pasos: [
      { op: 'Tejido',     linea: 'EXT', estado: 'TERMINADO' },
      { op: 'Embobinar',  linea: 'LC1', estado: 'TERMINADO' },
      { op: 'Confección', linea: 'LC3', estado: 'EN_PROCESO' },
      { op: 'Bastillar',  linea: 'LC3', estado: 'PENDIENTE' },
      { op: 'Etiquetado', linea: 'LK',  estado: 'PENDIENTE' },
    ],
  },
  {
    folio: 'OP-2026-00131',
    pedido: '183674',
    producto: 'Cubresuelo Negro 105 GR 7.70×100',
    linea: 'LK',
    operario: 'Erik',
    turno: 'Matutino',
    plan: 17800,
    producido: 7300,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
    pasos: [
      { op: 'Tejido',           linea: 'EXT', estado: 'TERMINADO' },
      { op: 'Corte',            linea: 'LK',  estado: 'EN_PROCESO' },
      { op: 'Bajada en rollos', linea: 'LK',  estado: 'PENDIENTE' },
      { op: 'Empaque',          linea: 'LK',  estado: 'PENDIENTE' },
    ],
  },
  {
    folio: 'OP-2026-00133',
    pedido: 'EZE-503',
    producto: 'Antigranizo Negra 2.08×46.5',
    linea: 'LC1',
    operario: 'Karen',
    turno: 'Matutino',
    plan: 558,
    producido: 312,
    estado: 'EN_PROCESO',
    fechaPlan: new Date(),
    pasos: [
      { op: 'Tejido',     linea: 'EXT', estado: 'TERMINADO' },
      { op: 'Confección', linea: 'LC1', estado: 'EN_PROCESO' },
      { op: 'Bastillar',  linea: 'LC1', estado: 'PENDIENTE' },
    ],
  },
  {
    folio: 'OP-2026-00136',
    pedido: 'VEG-1082',
    producto: 'Cubresuelo Azorrillado 1.80×500 perf. 70cm',
    linea: 'LP',
    operario: 'Carmen / Pao',
    turno: 'Matutino',
    plan: 900,
    producido: 216,
    estado: 'PAUSADA',
    fechaPlan: new Date(Date.now() + 24 * 3600 * 1000),
    pasos: [
      { op: 'Tejido',     linea: 'EXT', estado: 'TERMINADO' },
      { op: 'Perforar',   linea: 'LP',  estado: 'EN_PROCESO' },
      { op: 'Planchar',   linea: 'LP',  estado: 'PENDIENTE' },
      { op: 'Empaque',    linea: 'LK',  estado: 'PENDIENTE' },
    ],
  },
]

export default function ProduccionPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Producción</h1>
          <p className="page-subtitle">Líneas Mallatex y órdenes en planta · operaciones por paso.</p>
        </div>
        <Link href="/produccion/registro" className="btn-primary">
          <Factory className="h-4 w-4" />
          Registrar producción
        </Link>
      </div>

      {/* Cinta de líneas (5 reales) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LINEAS.map((l) => (
          <Card key={l.codigo} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-mallatex-green-700">{l.codigo}</span>
              <span
                className={
                  'h-2 w-2 rounded-full ' +
                  (l.estado === 'Activa'
                    ? 'bg-mallatex-green-500 animate-pulse'
                    : l.estado === 'Mantenimiento'
                      ? 'bg-mallatex-sun-500'
                      : 'bg-mallatex-soil-300')
                }
              />
            </div>
            <p className="mt-1 text-sm font-semibold text-mallatex-soil-900">{l.nombre}</p>
            <p className="mt-1 text-[11px] text-mallatex-soil-500 truncate" title={l.op}>{l.op}</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-2xl font-bold text-mallatex-soil-900">{l.oee}%</span>
              <span className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">OEE</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Lista de órdenes con ruta de pasos */}
      <Card className="p-0 overflow-hidden">
        <CardHeader title="Órdenes de producción" subtitle="Cada OP recorre su secuencia de operaciones" />
        <ul className="divide-y divide-mallatex-soil-200/60">
          {ORDENES.map((op) => {
            const pct = Math.round((op.producido / op.plan) * 100)
            return (
              <li key={op.folio} className="p-4 sm:p-5 hover:bg-mallatex-soil-50/40">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-mallatex-green-700">{op.folio}</span>
                      <Badge estado={op.estado} />
                      <Badge className="bg-mallatex-sky-300/30 text-mallatex-sky-700">{op.linea}</Badge>
                      <span className="font-mono text-[10px] text-mallatex-soil-500">Pedido {op.pedido}</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-mallatex-soil-900">{op.producto}</h3>
                    <div className="mt-1 text-xs text-mallatex-soil-500 flex flex-wrap gap-x-3">
                      <span>Operario: {op.operario}</span>
                      <span>Turno: {op.turno}</span>
                      <span>Plan: {formatDate(op.fechaPlan)}</span>
                    </div>

                    {/* Ruta de pasos */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {op.pasos.map((p, i) => (
                        <div
                          key={i}
                          className={
                            'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ' +
                            (p.estado === 'TERMINADO'
                              ? 'bg-mallatex-green-100 text-mallatex-green-800'
                              : p.estado === 'EN_PROCESO'
                                ? 'bg-mallatex-sun-300/40 text-mallatex-sun-700'
                                : 'bg-mallatex-soil-100 text-mallatex-soil-500')
                          }
                        >
                          {p.estado === 'TERMINADO' ? '✓' : i + 1}. {p.op}
                          <span className="opacity-60 font-mono">· {p.linea}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col lg:items-end gap-2 lg:min-w-[220px]">
                    <div className="flex justify-between lg:justify-end lg:gap-4 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">Producido</div>
                        <div className="font-semibold">
                          {formatNumber(op.producido)} / {formatNumber(op.plan)} m
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">Avance</div>
                        <div className="font-semibold">{pct}%</div>
                      </div>
                    </div>
                    <div className="w-full lg:w-56 h-2 rounded-full bg-mallatex-soil-100 overflow-hidden">
                      <div className="h-full bg-mallatex-green-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex gap-2 lg:flex-col">
                    {op.estado === 'EN_PROCESO' ? (
                      <button className="btn-secondary text-xs flex-1 lg:flex-none">
                        <Pause className="h-3.5 w-3.5" /> Pausar
                      </button>
                    ) : (
                      <button className="btn-primary text-xs flex-1 lg:flex-none">
                        <Play className="h-3.5 w-3.5" /> Iniciar
                      </button>
                    )}
                    <Link
                      href={`/produccion/registro?op=${op.folio}`}
                      className="btn-secondary text-xs flex-1 lg:flex-none"
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
