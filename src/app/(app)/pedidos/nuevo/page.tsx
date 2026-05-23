import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export const metadata = { title: 'Nuevo pedido' }

export default function NuevoPedidoPage() {
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link
          href="/pedidos"
          className="p-2 -ml-2 rounded-lg hover:bg-mallatex-soil-100"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="page-title">Nuevo pedido</h1>
          <p className="page-subtitle">Registra un pedido de agrotextiles para producción.</p>
        </div>
      </div>

      <Card>
        <form className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Cliente</label>
              <select className="input">
                <option>Invernaderos del Bajío S.A. de C.V.</option>
                <option>Agrícola Hortícola Culiacán S.P.R.</option>
                <option>Berries La Montaña S. de R.L.</option>
                <option value="">+ Nuevo cliente…</option>
              </select>
            </div>
            <div>
              <label className="label">Fecha compromiso</label>
              <input type="date" className="input" />
            </div>
            <div>
              <label className="label">Comercial responsable</label>
              <select className="input">
                <option>Eduardo Gamboa</option>
                <option>Carlos Supervisor</option>
              </select>
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select className="input">
                <option value="3">Normal</option>
                <option value="2">Alta</option>
                <option value="1">Urgente</option>
                <option value="5">Baja</option>
              </select>
            </div>
          </div>

          <hr className="border-mallatex-soil-200" />

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-mallatex-soil-900">Partidas</h3>
              <button type="button" className="btn-secondary text-xs">
                + Agregar partida
              </button>
            </div>
            <p className="text-xs text-mallatex-soil-500 mt-1">
              Selecciona productos del catálogo o personaliza especificaciones.
            </p>

            <div className="mt-3 card p-4 bg-mallatex-soil-50/40">
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label className="label">Producto</label>
                  <select className="input">
                    <option>MS-50-N-420 · Malla sombra 50% negra 4.20m</option>
                    <option>MS-70-V-420 · Malla sombra 70% verde 4.20m</option>
                    <option>MA-50x25-B-300 · Antiáfidos 50x25 3.00m</option>
                    <option>CS-100-N-420 · Cubre suelos 100 g 4.20m</option>
                    <option>MT-17-B-420 · Manta térmica 17 g 4.20m</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="label">Cantidad</label>
                  <input type="number" defaultValue="1000" className="input" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Unidad</label>
                  <select className="input">
                    <option>m lineal</option>
                    <option>m²</option>
                    <option>kg</option>
                    <option>rollo</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">P. unitario</label>
                  <input type="number" step="0.01" defaultValue="18.50" className="input" />
                </div>
              </div>

              <details className="mt-3">
                <summary className="text-xs font-medium text-mallatex-green-700 cursor-pointer">
                  Personalizar especificaciones técnicas
                </summary>
                <div className="grid gap-3 mt-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Ancho (m)</label>
                    <input type="number" step="0.01" defaultValue="4.20" className="input" />
                  </div>
                  <div>
                    <label className="label">% Sombra</label>
                    <input type="number" defaultValue="50" className="input" />
                  </div>
                  <div>
                    <label className="label">Color</label>
                    <select className="input">
                      <option>Negro</option>
                      <option>Verde</option>
                      <option>Blanco</option>
                      <option>Cristal</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>
          </div>

          <hr className="border-mallatex-soil-200" />

          <div>
            <label className="label">Notas internas</label>
            <textarea
              rows={3}
              className="input"
              placeholder="Instrucciones especiales, etiquetado, fletes, etc."
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link href="/pedidos" className="btn-secondary">Cancelar</Link>
            <button type="submit" className="btn-secondary">Guardar borrador</button>
            <button type="submit" className="btn-primary">Confirmar pedido</button>
          </div>
        </form>
      </Card>
    </div>
  )
}
