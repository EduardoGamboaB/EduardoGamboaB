import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

const FAMILIA_LABELS: Record<string, string> = {
  MALLA_SOMBRA: 'Malla sombra',
  MALLA_ANTIGRANIZO: 'Malla antigranizo',
  MALLA_ANTIPAJAROS: 'Malla antipájaros',
  MALLA_ANTIAFIDOS: 'Malla antiáfidos',
  MALLA_TUTOR: 'Malla tutoreo',
  CUBRE_SUELOS: 'Cubre suelos',
  MANTA_TERMICA: 'Manta térmica',
  RAFIA: 'Rafia',
  GEOTEXTIL: 'Geotextil',
  OTRO: 'Otro',
}

export const familiaLabel = (f: string) => FAMILIA_LABELS[f] ?? f

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADO: 'Confirmado',
  EN_PRODUCCION: 'En producción',
  TERMINADO: 'Terminado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  PAUSADA: 'Pausada',
  TERMINADA: 'Terminada',
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
    CANCELADO: 'bg-red-100 text-red-700',
    PAUSADA: 'bg-red-100 text-red-700',
  }
  return map[estado] ?? 'bg-mallatex-soil-100 text-mallatex-soil-700'
}
