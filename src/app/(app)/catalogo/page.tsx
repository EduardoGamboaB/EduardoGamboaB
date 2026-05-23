import { Plus, Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { familiaLabel, formatCurrency, formatMedida } from '@/lib/utils'

export const metadata = { title: 'Catálogo' }

const PRODUCTOS = [
  { sku: 'CUNEGRO105GR',            nombre: 'Cubresuelo Negro 105 GR',                 familia: 'CUBRESUELO_NEGRO',        ancho: 7.70, largo: 100, gramaje: 105, color: 'Negro',   precio: 13.5 },
  { sku: 'CUNEGRO105LV',            nombre: 'Cubresuelo Negro Línea Verde',            familia: 'CUBRESUELO_LINEA_VERDE',  ancho: 0.78, largo: 237, gramaje: 105, color: 'Negro/Verde', precio: 14.8 },
  { sku: 'CUAZORR105P70',           nombre: 'Cubresuelo Azorrillado perforado 70cm',   familia: 'CUBRESUELO_AZORRILLADO',  ancho: 1.80, largo: 500, gramaje: 105, color: 'Negro',   carac: 'Perforados c/70 cm', precio: 16.2 },
  { sku: 'ANTIAFIDO10X16CRISTAL',   nombre: 'Antiáfido 10×16 cristal',                 familia: 'ANTIAFIDO', ancho: 0.65, largo: 120, color: 'Cristal',  densidad: '10×16', precio: 42 },
  { sku: 'ANTIAFIDO10X20BICOLOR',   nombre: 'Antiáfido 10×20 bicolor',                 familia: 'ANTIAFIDO', ancho: 3.70, largo: 15,  color: 'Bicolor',  densidad: '10×20', precio: 44 },
  { sku: 'ANTIAFIDO10X20CRISTAL289',nombre: 'Antiáfido 10×20 cristal',                 familia: 'ANTIAFIDO', ancho: 1.00, largo: 289, color: 'Cristal',  densidad: '10×20', precio: 45 },
  { sku: 'ANTIAFIDO12X22CRISTAL',   nombre: 'Antiáfido 12×22 cristal',                 familia: 'ANTIAFIDO', ancho: 5.20, largo: 6,   color: 'Cristal',  densidad: '12×22', precio: 50 },
  { sku: 'ANTIAFIDO13X31CRISTAL128',nombre: 'Antiáfido 13×31 cristal',                 familia: 'ANTIAFIDO', ancho: 1.00, largo: 128, color: 'Cristal',  densidad: '13×31', precio: 56 },
  { sku: 'ANTIAFIDO13X31BICOLOR',   nombre: 'Antiáfido 13×31 bicolor',                 familia: 'ANTIAFIDO', ancho: 3.50, largo: 11,  color: 'Bicolor',  densidad: '13×31', precio: 58 },
  { sku: 'ANTIGRANIZONEGRA',        nombre: 'Antigranizo negra',                       familia: 'ANTIGRANIZO', ancho: 2.08, largo: 46.5, color: 'Negro',  precio: 34 },
  { sku: 'ANTIGRANIZOBLANCA',       nombre: 'Antigranizo blanca',                      familia: 'ANTIGRANIZO', ancho: 3.70, largo: 8,    color: 'Blanco', precio: 30 },
  { sku: 'ANTIGRANIZOCRISTAL',      nombre: 'Antigranizo cristal',                     familia: 'ANTIGRANIZO', ancho: 0.90, largo: 29.5, color: 'Cristal',precio: 32 },
  { sku: 'ANTIGRANIZOESPCONF',      nombre: 'Antigranizo especial confeccionada',      familia: 'ANTIGRANIZO', color: 'Negro', carac: 'A medida', precio: 48 },
  { sku: 'MANTATERM160NEG',         nombre: 'Manta térmica negra',                     familia: 'MANTA_TERMICA', ancho: 1.60, color: 'Negro',  precio: 11 },
  { sku: 'MANTATERM110BLA',         nombre: 'Manta térmica blanca',                    familia: 'MANTA_TERMICA', ancho: 1.10, color: 'Blanco', precio: 10 },
  { sku: 'MONOFIL40BLA37X145',      nombre: 'Monofilamento 40% blanca',                familia: 'MONOFILAMENTO', ancho: 3.70, largo: 14.5, color: 'Blanco', porcentaje: 40, precio: 38 },
  { sku: 'PANTERM180X18',           nombre: 'Pantalla térmica plastificada 1 cara',    familia: 'PANTALLA_TERMICA', ancho: 1.80, largo: 18, color: 'Blanco', carac: 'Plastificada', precio: 65 },
  { sku: 'RASCHEL35BLANCA',         nombre: 'Raschel 35% blanca',                      familia: 'RASCHEL', ancho: 4.10, largo: 74, color: 'Blanco', porcentaje: 35, precio: 28 },
  { sku: 'RASCHELNEGRA90',          nombre: 'Raschel negra',                           familia: 'RASCHEL', ancho: 0.90, largo: 100, color: 'Negro', precio: 22 },
  { sku: 'ESPALDERACUADCHN',        nombre: 'Espaldera cuadro chico negra',            familia: 'ESPALDERA', ancho: 1.05, color: 'Negro', precio: 18 },
  { sku: 'EXTRUIDAVERDE',           nombre: 'Extruida verde',                          familia: 'EXTRUIDA', color: 'Verde', precio: 15 },
  { sku: 'GALLINERAVERDE4',         nombre: 'Malla gallinera verde',                   familia: 'MALLA_GALLINERA', ancho: 4.00, largo: 213.5, color: 'Verde', precio: 19 },
  { sku: 'SOGANEGRA',               nombre: 'Soga negra',                              familia: 'SOGA', color: 'Negro', precio: 6 },
] as Array<any>

export default function CatalogoPage() {
  const familias = Array.from(new Set(PRODUCTOS.map((p) => p.familia)))

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Catálogo de productos</h1>
          <p className="page-subtitle">{PRODUCTOS.length} SKU activos · familias Mallatex.</p>
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
              placeholder="Buscar por SKU, nombre, color o densidad…"
              className="input pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 lg:overflow-visible lg:flex-wrap">
            <button className="btn-primary whitespace-nowrap py-2 px-3 text-xs">Todas</button>
            {familias.slice(0, 5).map((f) => (
              <button key={f} className="btn-ghost whitespace-nowrap py-2 px-3 text-xs border border-mallatex-soil-200">
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
              <div className="min-w-0">
                <Badge className="bg-mallatex-green-100 text-mallatex-green-800 text-[10px]">
                  {familiaLabel(p.familia)}
                </Badge>
                <h3 className="mt-2 font-semibold text-mallatex-soil-900 leading-tight">{p.nombre}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-mallatex-soil-500 break-all">{p.sku}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-mallatex-green-100 to-mallatex-green-200 flex-shrink-0" />
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              {p.ancho && (
                <div className="flex justify-between"><dt className="text-mallatex-soil-500">Medida:</dt><dd className="font-medium">{formatMedida(p.ancho, p.largo)}</dd></div>
              )}
              {p.gramaje && (
                <div className="flex justify-between"><dt className="text-mallatex-soil-500">Gramaje:</dt><dd className="font-medium">{p.gramaje} g/m²</dd></div>
              )}
              {p.densidad && (
                <div className="flex justify-between"><dt className="text-mallatex-soil-500">Densidad:</dt><dd className="font-medium">{p.densidad}</dd></div>
              )}
              {p.porcentaje && (
                <div className="flex justify-between"><dt className="text-mallatex-soil-500">% cobertura:</dt><dd className="font-medium">{p.porcentaje}%</dd></div>
              )}
              {p.color && (
                <div className="flex justify-between"><dt className="text-mallatex-soil-500">Color:</dt><dd className="font-medium">{p.color}</dd></div>
              )}
              {p.carac && (
                <div className="col-span-2 flex justify-between"><dt className="text-mallatex-soil-500">Especial:</dt><dd className="font-medium text-mallatex-green-700">{p.carac}</dd></div>
              )}
            </dl>

            <div className="mt-4 pt-3 border-t border-mallatex-soil-200 flex items-center justify-between">
              <span className="text-lg font-bold text-mallatex-green-800">{formatCurrency(p.precio)}</span>
              <span className="text-xs text-mallatex-soil-500">por m{p.familia.startsWith('CUBRE') ? '²' : ''}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
