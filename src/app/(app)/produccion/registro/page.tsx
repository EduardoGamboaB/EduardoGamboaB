import Link from 'next/link'
import { ArrowLeft, QrCode, Plus, Minus, AlertOctagon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export const metadata = { title: 'Registrar producción' }

export default function RegistroProduccionPage() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/produccion" className="p-2 -ml-2 rounded-lg hover:bg-mallatex-soil-100" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="page-title">Registro de producción</h1>
          <p className="page-subtitle">Captura tu avance en línea · turno actual</p>
        </div>
      </div>

      <Card className="p-6 bg-mallatex-green-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/15 p-3">
            <QrCode className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Escanear etiqueta de OP / rollo</h3>
            <p className="text-xs text-mallatex-green-100/90 mt-0.5">
              Apunta la cámara al QR de la etiqueta Mallatex.
            </p>
          </div>
          <button className="btn bg-white text-mallatex-green-800 hover:bg-mallatex-green-50">
            Escanear
          </button>
        </div>
      </Card>

      <Card>
        <form className="space-y-5">
          <div>
            <label className="label">Orden de producción</label>
            <select className="input">
              <option value="OP-2026-00128">OP-2026-00128 · Raschel 35% Blanca 4.10×74 (VFGC-872)</option>
              <option value="OP-2026-00131">OP-2026-00131 · Cubresuelo Negro 105 GR 7.70×100 (183674)</option>
              <option value="OP-2026-00133">OP-2026-00133 · Antigranizo Negra 2.08×46.5 (EZE-503)</option>
              <option value="OP-2026-00136">OP-2026-00136 · Cubresuelo Azorrillado 1.80×500 (VEG-1082)</option>
            </select>
            <div className="mt-3 p-3 rounded-lg bg-mallatex-green-50 text-sm">
              <div className="font-semibold text-mallatex-green-800">Raschel 35% Blanca · 4.10×74</div>
              <div className="text-xs text-mallatex-green-700/80 mt-0.5">
                Plan: 740 m · Producido: 533 m · Pendiente: 207 m
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Línea</label>
              <select className="input">
                <option value="LC1">LC1 · Costura 1</option>
                <option value="LC2">LC2 · Costura 2</option>
                <option value="LC3" selected>LC3 · Costura 3</option>
                <option value="LK">LK · Corte</option>
                <option value="LP">LP · Perforadora</option>
              </select>
            </div>
            <div>
              <label className="label">Operación</label>
              <select className="input">
                <option>Embobinar</option>
                <option>Planchar</option>
                <option selected>Confección</option>
                <option>Confeccionada</option>
                <option>Azorrillado</option>
                <option>Perforar</option>
                <option>Corte</option>
                <option>Bastillar</option>
                <option>Bajada en colillos</option>
                <option>Bajada en rollos</option>
                <option>Etiquetado</option>
                <option>Empaque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Operario</label>
              <select className="input">
                <option>Lorena</option>
                <option>Karen</option>
                <option>Jesús</option>
                <option>Carmen</option>
                <option>Pao</option>
                <option>Eva</option>
                <option>Pedro</option>
                <option>Fátima</option>
                <option>Nayeli</option>
                <option>Erik</option>
                <option>Laura</option>
                <option>Don Gera</option>
              </select>
            </div>
            <div>
              <label className="label">Turno</label>
              <select className="input">
                <option>Matutino (06:00–14:00)</option>
                <option>Vespertino (14:00–22:00)</option>
                <option>Nocturno (22:00–06:00)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Metros producidos en este turno</label>
            <div className="flex items-stretch gap-2">
              <button type="button" className="btn-secondary px-4 text-xl" aria-label="Restar 10">
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                defaultValue="120"
                className="input text-center text-3xl font-bold py-4"
                inputMode="numeric"
              />
              <button type="button" className="btn-secondary px-4 text-xl" aria-label="Sumar 10">
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-mallatex-soil-500">Usa +/- para sumar de 10 en 10 metros.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rollos terminados</label>
              <input type="number" defaultValue="2" className="input text-center text-xl py-3" inputMode="numeric" />
            </div>
            <div>
              <label className="label">Lote MP consumido</label>
              <input type="text" placeholder="ej. 6619" className="input text-center text-xl py-3" />
            </div>
          </div>

          <details className="rounded-lg border border-mallatex-soil-200 p-3">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-mallatex-soil-800">
              <AlertOctagon className="h-4 w-4 text-mallatex-sun-500" />
              Registrar incidencia / paro
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="label">Categoría</label>
                <select className="input">
                  <option>Excedente</option>
                  <option>Defecto detectado</option>
                  <option>Faltante</option>
                  <option>Sobrante</option>
                  <option>Desperdicio</option>
                </select>
              </div>
              <div>
                <label className="label">Cantidad (m)</label>
                <input type="number" className="input" inputMode="numeric" />
              </div>
              <div className="col-span-2">
                <label className="label">Observaciones</label>
                <input type="text" className="input" placeholder="Detalle de la incidencia" />
              </div>
            </div>
          </details>

          <div>
            <label className="label">Notas del turno</label>
            <textarea rows={2} className="input" placeholder="Opcional" />
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base">
            Guardar registro
          </button>
        </form>
      </Card>
    </div>
  )
}
