import Link from 'next/link'
import { ArrowLeft, QrCode, Plus, Minus, AlertOctagon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export const metadata = { title: 'Registrar producción' }

/**
 * Formulario mobile-first para que el operario registre producción
 * en planta desde tablet o teléfono. Botones grandes, tipografía amplia,
 * orientación vertical, soporte futuro para escaneo de QR.
 */
export default function RegistroProduccionPage() {
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          href="/produccion"
          className="p-2 -ml-2 rounded-lg hover:bg-mallatex-soil-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="page-title">Registro de producción</h1>
          <p className="page-subtitle">Captura tu avance en máquina · Turno actual</p>
        </div>
      </div>

      {/* Escaneo QR (CTA grande) */}
      <Card className="p-6 bg-mallatex-green-800 text-white border-0">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-white/15 p-3">
            <QrCode className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Escanear orden de producción</h3>
            <p className="text-xs text-mallatex-green-100/90 mt-0.5">
              Apunta la cámara al QR pegado en la orden.
            </p>
          </div>
          <button className="btn bg-white text-mallatex-green-800 hover:bg-mallatex-green-50">
            Escanear
          </button>
        </div>
      </Card>

      <Card>
        <form className="space-y-5">
          {/* Orden seleccionada */}
          <div>
            <label className="label">Orden de producción</label>
            <select className="input">
              <option value="OP-2026-00001">OP-2026-00001 · Malla sombra 50% negra (TEL-01)</option>
              <option value="OP-2026-00002">OP-2026-00002 · Antiáfidos 50x25 (TEL-02)</option>
              <option value="OP-2026-00003">OP-2026-00003 · Cubre suelos 100g (TEJ-01)</option>
            </select>
            <div className="mt-3 p-3 rounded-lg bg-mallatex-green-50 text-sm">
              <div className="font-semibold text-mallatex-green-800">Malla sombra 50% negra 4.20m</div>
              <div className="text-xs text-mallatex-green-700/80 mt-0.5">
                Plan: 1,000 m · Producido: 420 m · Pendiente: 580 m
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Máquina</label>
              <select className="input">
                <option>TEL-01 · Telar Raschel 01</option>
                <option>TEL-02 · Telar Raschel 02</option>
                <option>EXT-01 · Extrusora</option>
                <option>TEJ-01 · Tejedora circular</option>
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

          {/* Metros producidos — control grande móvil-first */}
          <div>
            <label className="label">Metros producidos en este turno</label>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                className="btn-secondary px-4 text-xl"
                aria-label="Restar 10"
              >
                <Minus className="h-5 w-5" />
              </button>
              <input
                type="number"
                defaultValue="420"
                className="input text-center text-3xl font-bold py-4"
                inputMode="numeric"
              />
              <button
                type="button"
                className="btn-secondary px-4 text-xl"
                aria-label="Sumar 10"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-mallatex-soil-500">
              Usa +/- para sumar de 10 en 10 metros.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Merma (m)</label>
              <input
                type="number"
                defaultValue="0"
                className="input text-center text-xl py-3"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="label">Rollos terminados</label>
              <input
                type="number"
                defaultValue="0"
                className="input text-center text-xl py-3"
                inputMode="numeric"
              />
            </div>
          </div>

          {/* Reporte de paro */}
          <details className="rounded-lg border border-mallatex-soil-200 p-3">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-mallatex-soil-800">
              <AlertOctagon className="h-4 w-4 text-mallatex-sun-500" />
              Registrar paro de máquina
            </summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2">
                <label className="label">Motivo</label>
                <select className="input">
                  <option>CAMBIO_MOLDE</option>
                  <option>MANTENIMIENTO</option>
                  <option>FALLA_MAQUINA</option>
                  <option>FALTA_MATERIA_PRIMA</option>
                  <option>CAMBIO_TURNO</option>
                  <option>CALIDAD</option>
                  <option>ENERGIA</option>
                  <option>OTRO</option>
                </select>
              </div>
              <div>
                <label className="label">Inicio</label>
                <input type="time" className="input" />
              </div>
              <div>
                <label className="label">Duración (min)</label>
                <input type="number" className="input" inputMode="numeric" />
              </div>
            </div>
          </details>

          <div>
            <label className="label">Observaciones</label>
            <textarea
              rows={2}
              className="input"
              placeholder="Notas del turno (opcional)"
            />
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base">
            Guardar registro
          </button>
        </form>
      </Card>
    </div>
  )
}
