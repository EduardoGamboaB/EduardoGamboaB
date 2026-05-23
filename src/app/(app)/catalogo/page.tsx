import { Plus, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { familiaLabel, formatCurrency } from '@/lib/utils'

export const metadata = { title: 'Catálogo' }

const PRODUCTOS = [
  {
    sku: 'MS-50-N-420',
    nombre: 'Malla sombra 50% negra 4.20m',
    familia: 'MALLA_SOMBRA',
    especs: { ancho: '4.20m', gramaje: '80 g/m²', sombra: '50%', color: 'Negro', uv: '5 años' },
    precio: 18.5,
  },
  {
    sku: 'MS-70-V-420',
    nombre: 'Malla sombra 70% verde 4.20m',
    familia: 'MALLA_SOMBRA',
    especs: { ancho: '4.20m', gramaje: '110 g/m²', sombra: '70%', color: 'Verde', uv: '5 años' },
    precio: 24.0,
  },
  {
    sku: 'MA-50x25-B-300',
    nombre: 'Malla antiáfidos 50x25 cristal 3.00m',
    familia: 'MALLA_ANTIAFIDOS',
    especs: { ancho: '3.00m', hilos: '50x25', color: 'Cristal', gramaje: '78 g/m²' },
    precio: 42.0,
  },
  {
    sku: 'CS-100-N-420',
    nombre: 'Cubre suelos 100 g/m² negro 4.20m',
    familia: 'CUBRE_SUELOS',
    especs: { ancho: '4.20m', gramaje: '100 g/m²', color: 'Negro', permeable: 'Sí' },
    precio: 12.5,
  },
  {
    sku: 'MAG-12-C-700',
    nombre: 'Malla antigranizo 12g cristal 7.00m',
    familia: 'MALLA_ANTIGRANIZO',
    especs: { ancho: '7.00m', gramaje: '65 g/m²', color: 'Cristal' },
    precio: 32.0,
  },
  {
    sku: 'MT-17-B-420',
    nombre: 'Manta térmica 17 g/m² blanca 4.20m',
    familia: 'MANTA_TERMICA',
    especs: { ancho: '4.20m', gramaje: '17 g/m²', color: 'Blanco' },
    precio: 9.8,
  },
  {
    sku: 'MT-RP-N-200',
    nombre: 'Malla tutoreo rafia 2.00m',
    familia: 'MALLA_TUTOR',
    especs: { ancho: '2.00m', cuadricula: '15x17 cm', color: 'Negro' },
    precio: 14.0,
  },
  {
    sku: 'MP-30-B-500',
    nombre: 'Malla antipájaros 30 mm 5.00m',
    familia: 'MALLA_ANTIPAJAROS',
    especs: { ancho: '5.00m', cuadricula: '30 mm', color: 'Negro' },
    precio: 19.0,
  },
]

export default function CatalogoPage() {
  const familias = Array.from(new Set(PRODUCTOS.map((p) => p.familia)))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Catálogo de productos</h1>
          <p className="page-subtitle">Agrotextiles Mallatex disponibles para producción.</p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mallatex-soil-500" />
            <input
              type="search"
              placeholder="Buscar por SKU, nombre o familia…"
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button className="btn-primary whitespace-nowrap py-2 px-3 text-xs">Todas</button>
            {familias.slice(0, 4).map((f) => (
              <button
                key={f}
                className="btn-ghost whitespace-nowrap py-2 px-3 text-xs border border-mallatex-soil-200"
              >
                {familiaLabel(f)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PRODUCTOS.map((p) => (
          <Card key={p.sku} className="hover:shadow-elevated transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge className="bg-mallatex-green-100 text-mallatex-green-800 text-[10px]">
                  {familiaLabel(p.familia)}
                </Badge>
                <h3 className="mt-2 font-semibold text-mallatex-soil-900 leading-tight">
                  {p.nombre}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-mallatex-soil-500">{p.sku}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-mallatex-green-100 to-mallatex-green-200 flex-shrink-0" />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {Object.entries(p.especs).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-mallatex-soil-500 capitalize">{k}:</dt>
                  <dd className="font-medium text-mallatex-soil-800 truncate ml-1">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 pt-3 border-t border-mallatex-soil-200 flex items-center justify-between">
              <span className="text-lg font-bold text-mallatex-green-800">
                {formatCurrency(p.precio)}
              </span>
              <span className="text-xs text-mallatex-soil-500">por m lineal</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
