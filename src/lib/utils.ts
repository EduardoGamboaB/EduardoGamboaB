import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const EMPRESA = {
  razonSocial: 'TEJIDOS TÉCNICOS MALLATEX, S.A. DE C.V.',
  nombreCorto: 'Mallatex',
  slogan: 'Protegemos lo que siembras',
  direccion: 'Av. Iturbide (El Colli) No. 5210, Col. El Colli Urbano, C.P. 45070',
  ciudad: 'Zapopan, Jalisco, México',
}

export function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(date)
}

export function formatDateTime(d: Date | string) {
  return formatDate(d, { hour: '2-digit', minute: '2-digit' })
}

/** Formato de medida Mallatex: ancho × largo (ej. "3.30×100" o "1.80×500") */
export function formatMedida(ancho?: number | null, largo?: number | null) {
  if (!ancho && !largo) return '—'
  if (ancho && largo) return `${ancho.toFixed(2).replace(/\.00$/, '')}×${largo}`
  return ancho ? `${ancho.toFixed(2)}` : `${largo}`
}

const FAMILIA_LABELS: Record<string, string> = {
  CUBRESUELO_NEGRO: 'Cubresuelo Negro',
  CUBRESUELO_AZORRILLADO: 'Cubresuelo Azorrillado',
  CUBRESUELO_LINEA_VERDE: 'Cubresuelo Línea Verde',
  ANTIAFIDO: 'Antiáfido',
  ANTIGRANIZO: 'Antigranizo',
  MANTA_TERMICA: 'Manta Térmica',
  MONOFILAMENTO: 'Monofilamento',
  PANTALLA_TERMICA: 'Pantalla Térmica',
  RASCHEL: 'Raschel',
  ESPALDERA: 'Espaldera',
  EXTRUIDA: 'Extruida',
  MALLA_GALLINERA: 'Malla Gallinera',
  MALLA_TUTOR: 'Malla Tutor',
  SOGA: 'Soga',
  OTRO: 'Otro',
}
export const familiaLabel = (f: string) => FAMILIA_LABELS[f] ?? f

const OPERACION_LABELS: Record<string, string> = {
  EXTRUSION: 'Extrusión',
  TEJIDO: 'Tejido',
  EMBOBINAR: 'Embobinar',
  PLANCHAR: 'Planchar',
  CONFECCION: 'Confección',
  CONFECCIONADA: 'Confeccionada',
  AZORRILLADO: 'Azorrillado',
  PERFORAR: 'Perforar',
  CORTE: 'Corte',
  BASTILLAR: 'Bastillar',
  BAJADA_COLILLOS: 'Bajada en colillos',
  BAJADA_ROLLOS: 'Bajada en rollos',
  ETIQUETADO: 'Etiquetado',
  EMPAQUE: 'Empaque',
  ACABADO: 'Acabado',
  OTRO: 'Otro',
}
export const operacionLabel = (o: string) => OPERACION_LABELS[o] ?? o

const CATEGORIA_MP_LABELS: Record<string, string> = {
  EXCEDENTE: 'Excedente',
  DEFECTO: 'Defecto detectado',
  FALTANTE: 'Faltante',
  SOBRANTE: 'Sobrante',
  DESPERDICIO: 'Desperdicio',
}
export const categoriaMpLabel = (c: string) => CATEGORIA_MP_LABELS[c] ?? c

export function categoriaMpColor(c: string) {
  const map: Record<string, string> = {
    EXCEDENTE: 'bg-mallatex-green-100 text-mallatex-green-800',
    DEFECTO: 'bg-red-100 text-red-700',
    FALTANTE: 'bg-mallatex-sun-300/40 text-mallatex-sun-700',
    SOBRANTE: 'bg-mallatex-sky-300/40 text-mallatex-sky-700',
    DESPERDICIO: 'bg-mallatex-soil-200 text-mallatex-soil-700',
  }
  return map[c] ?? 'bg-mallatex-soil-100 text-mallatex-soil-700'
}

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADO: 'Confirmado',
  EN_PRODUCCION: 'En producción',
  TERMINADO: 'Terminado',
  ENTREGADO: 'Entregado',
  ENTREGADO_PARCIAL: 'Entrega parcial',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  PAUSADA: 'Pausada',
  TERMINADA: 'Terminada',
  OMITIDO: 'Omitido',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  RETRABAJO: 'Retrabajo',
  LIBERADO: 'Liberado',
  EN_INSPECCION: 'En inspección',
}
export const estadoLabel = (e: string) => ESTADO_LABELS[e] ?? e

export function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    BORRADOR: 'bg-mallatex-soil-100 text-mallatex-soil-700',
    CONFIRMADO: 'bg-mallatex-sky-300/30 text-mallatex-sky-700',
    EN_PRODUCCION: 'bg-mallatex-sun-300/40 text-mallatex-sun-700',
    EN_PROCESO: 'bg-mallatex-sun-300/40 text-mallatex-sun-700',
    PENDIENTE: 'bg-mallatex-soil-100 text-mallatex-soil-700',
    TERMINADO: 'bg-mallatex-green-100 text-mallatex-green-800',
    TERMINADA: 'bg-mallatex-green-100 text-mallatex-green-800',
    ENTREGADO: 'bg-mallatex-green-200 text-mallatex-green-900',
    ENTREGADO_PARCIAL: 'bg-mallatex-sky-300/40 text-mallatex-sky-700',
    CANCELADO: 'bg-red-100 text-red-700',
    PAUSADA: 'bg-red-100 text-red-700',
    APROBADO: 'bg-mallatex-green-100 text-mallatex-green-800',
    RECHAZADO: 'bg-red-100 text-red-700',
    RETRABAJO: 'bg-mallatex-sun-300/40 text-mallatex-sun-700',
    LIBERADO: 'bg-mallatex-green-200 text-mallatex-green-900',
    EN_INSPECCION: 'bg-mallatex-sky-300/40 text-mallatex-sky-700',
  }
  return map[estado] ?? 'bg-mallatex-soil-100 text-mallatex-soil-700'
}
