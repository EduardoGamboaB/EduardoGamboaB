import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CheckCircle2, XCircle, AlertTriangle, Truck, ClipboardCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export const metadata = { title: 'Montacargas · Check List' }

const SECCIONES = [
  {
    titulo: 'Inspección Visual (Llave OFF)',
    items: [
      { grupo: 'Ruedas',                puntos: ['No despegadas / áreas lisas', 'Sin fallas en tuercas o birlos', 'Rodamiento adecuado'] },
      { grupo: 'Niveles',               puntos: ['Aceite de motor', 'Aceite hidráulico', 'Aceite de transmisión', 'Anticongelante', 'Líquido de frenos'] },
      { grupo: 'Sistema levante',       puntos: ['Sin daño en cadena/mangueras/baleros', 'Palancas funcionan libremente', 'Horquilla en buen estado'] },
      { grupo: 'Controles',             puntos: ['Se mueven sin trabarse', 'Responden sin problema'] },
      { grupo: 'General',               puntos: ['Guardas completas', 'Calcomanías de seguridad', 'Respaldo carga sin daño', 'Verificar fugas en piso', 'Componentes apretados'] },
    ],
  },
  {
    titulo: 'Inspección Operacional (Llave ON)',
    items: [
      { grupo: 'Seguridad',             puntos: ['Bocina', 'Cinturón', 'Alarma reversa', 'Torreta', 'Espejos', 'Luces de trabajo', 'Extintor vigente'] },
      { grupo: 'Avance / dirección',    puntos: ['Dirección suave sin ruido', 'Sin ruidos extraños en motor/transmisión', 'Pedales acelerador/freno/acercamiento OK'] },
      { grupo: 'Sistema levante',       puntos: ['Controles según especificación', 'Sin fugas aparentes al levantar'] },
      { grupo: 'Frenos',                puntos: ['Pedal libre sin trabarse', 'Detención a distancia esperada'] },
    ],
  },
]

const INSPECCIONES_RECIENTES = [
  { fecha: new Date('2026-05-23'), montacargas: 'M-01', operador: 'Néstor Hernández', turno: 'Matutino', estado: 'APROBADO', revisiones: 0 },
  { fecha: new Date('2026-05-23'), montacargas: 'M-02', operador: 'Néstor Hernández', turno: 'Matutino', estado: 'CON_REVISION', revisiones: 1 },
  { fecha: new Date('2026-05-22'), montacargas: 'M-01', operador: 'Néstor Hernández', turno: 'Matutino', estado: 'APROBADO', revisiones: 0 },
  { fecha: new Date('2026-05-22'), montacargas: 'M-02', operador: 'Néstor Hernández', turno: 'Matutino', estado: 'APROBADO', revisiones: 0 },
]

export default function MontacargasPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Check List diario · Montacargas</h1>
          <p className="page-subtitle">Inspección OFF + ON al inicio de cada turno · firma operador + supervisor.</p>
        </div>
        <button className="btn-primary">
          <ClipboardCheck className="h-4 w-4" /> Iniciar inspección
        </button>
      </div>

      {/* Resumen de activos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { eco: 'M-01', modelo: 'Yale GLP050VX',  estado: 'OK',          ultimo: 'Hoy 06:05', op: 'Néstor', tone: 'green' as const },
          { eco: 'M-02', modelo: 'Toyota 8FGCU25', estado: 'Con revisión', ultimo: 'Hoy 06:10', op: 'Néstor', tone: 'sun'   as const },
        ].map((m) => (
          <Card key={m.eco}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-mallatex-soil-500">{m.eco}</div>
                <div className="font-semibold text-mallatex-soil-900">{m.modelo}</div>
              </div>
              <Truck className={m.tone === 'green' ? 'h-5 w-5 text-mallatex-green-700' : 'h-5 w-5 text-mallatex-sun-700'} />
            </div>
            <div className="mt-3 text-sm">
              <div className="flex items-center gap-1">
                {m.tone === 'green' ? (
                  <CheckCircle2 className="h-4 w-4 text-mallatex-green-700" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-mallatex-sun-700" />
                )}
                <span className="font-semibold">{m.estado}</span>
              </div>
              <p className="text-xs text-mallatex-soil-500 mt-1">Última inspección: {m.ultimo} · {m.op}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Plantilla de inspección" subtitle="Marcar OK / R / N/A en cada punto" />
        <div className="grid gap-4 lg:grid-cols-2">
          {SECCIONES.map((s) => (
            <div key={s.titulo}>
              <h4 className="font-semibold text-mallatex-soil-900 mb-2">{s.titulo}</h4>
              <div className="space-y-3">
                {s.items.map((g) => (
                  <div key={g.grupo} className="rounded-lg border border-mallatex-soil-200 p-3">
                    <p className="text-sm font-semibold text-mallatex-green-800">{g.grupo}</p>
                    <ul className="mt-1.5 space-y-0.5">
                      {g.puntos.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-xs text-mallatex-soil-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-mallatex-green-500 mt-0.5 flex-shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <CardHeader title="Inspecciones recientes" />
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-mallatex-soil-500">
            <tr className="border-b border-mallatex-soil-200">
              <th className="px-5 py-2 font-medium">Fecha</th>
              <th className="px-5 py-2 font-medium">Montacargas</th>
              <th className="px-5 py-2 font-medium">Operador</th>
              <th className="px-5 py-2 font-medium">Turno</th>
              <th className="px-5 py-2 font-medium">Estado</th>
              <th className="px-5 py-2 font-medium text-right">Puntos R</th>
            </tr>
          </thead>
          <tbody>
            {INSPECCIONES_RECIENTES.map((i, idx) => (
              <tr key={idx} className="border-b border-mallatex-soil-200/60 last:border-0">
                <td className="px-5 py-3">{formatDate(i.fecha)}</td>
                <td className="px-5 py-3 font-mono">{i.montacargas}</td>
                <td className="px-5 py-3">{i.operador}</td>
                <td className="px-5 py-3">{i.turno}</td>
                <td className="px-5 py-3">
                  {i.estado === 'APROBADO' ? (
                    <Badge className="bg-mallatex-green-100 text-mallatex-green-800"><CheckCircle2 className="h-3 w-3" />Aprobado</Badge>
                  ) : (
                    <Badge className="bg-mallatex-sun-300/40 text-mallatex-sun-700"><AlertTriangle className="h-3 w-3" />Con revisión</Badge>
                  )}
                </td>
                <td className="px-5 py-3 text-right font-semibold">{i.revisiones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
