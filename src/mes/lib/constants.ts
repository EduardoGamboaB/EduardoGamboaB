/**
 * Mallatex MES — catálogo de constantes:
 *   roles, competencias, procesos, categorías, estados, líneas, mapas emoji,
 *   clientes y perfiles por rol.
 */
import { brand } from './brand'

export const ROLES = {
  OPERACIONES: 'operaciones',
  ALMACEN: 'almacen',
  PRODUCCION: 'produccion',
  MONTACARGAS_PROD: 'montacargas',
  OPERADOR: 'operador',
  COBRANZA: 'cobranza',
  COMPRAS: 'compras',
} as const

export const OPERATOR_TYPES = {
  A: { label: 'Tipo A', desc: '1 máquina', maquinas: 1 },
  B: { label: 'Tipo B', desc: '2 máquinas', maquinas: 2 },
  C: { label: 'Tipo C', desc: '3 máquinas', maquinas: 3 },
  D: { label: 'Tipo D', desc: '4 máquinas (todas)', maquinas: 4 },
}

export const PROCESOS_PRODUCCION = [
  { id: 'corte',       label: 'Corte',       icon: 'Scissors',  desc: 'Corte o ajuste de medidas' },
  { id: 'perforacion', label: 'Perforación', icon: 'Hash',      desc: 'Recorte o impresión de patrones' },
  { id: 'costura',     label: 'Costura',     icon: 'Sparkles',  desc: 'Unión de dos o más partes' },
  { id: 'embobinado',  label: 'Embobinado',  icon: 'Package',   desc: 'Enrollar el material en un tubo' },
] as const

export const CATEGORIAS_MATERIAL = {
  PRIMA:       { id: 'prima',       label: 'Materia prima', color: brand.black, desc: 'Material para conformar producción' },
  SOBRANTE:    { id: 'sobrante',    label: 'Sobrante',      color: brand.ok,    desc: 'Útil, regresa al almacén' },
  DEFECTO:     { id: 'defecto',     label: 'Defecto',       color: brand.warn,  desc: 'Defecto de fábrica, evidencia proveedor' },
  DESPERDICIO: { id: 'desperdicio', label: 'Desperdicio',   color: brand.bad,   desc: 'No es posible utilizar' },
} as const

export const ESTADOS_PEDIDO = {
  COBRANZA_PENDIENTE: { id: 'cobranza-pendiente', label: 'Pendiente cobranza', color: '#888' },
  LIBERADO:           { id: 'liberado',           label: 'Liberado',           color: brand.ok },
  STOCK_FALTANTE:     { id: 'stock-faltante',     label: 'Sin stock',          color: brand.warn },
  COMPRA_PENDIENTE:   { id: 'compra-pendiente',   label: 'En compra',          color: brand.warn },
  MATERIAL_EGRESADO:  { id: 'material-egresado',  label: 'Material egresado',  color: brand.ok },
  EN_PRODUCCION:      { id: 'en-produccion',      label: 'En producción',      color: brand.red },
  TERMINADO:          { id: 'terminado',          label: 'Terminado',          color: brand.ok },
  ENTREGADO:          { id: 'entregado',          label: 'Entregado',          color: brand.black },
  DETENIDO:           { id: 'detenido',           label: 'Detenido',           color: brand.warn },
} as const

export const FORMAS_ENTREGA = [
  'ALMACEN', 'MALLATEX', 'MALLATEX envía campo', 'PAQUETERIA', 'TRES GUERRAS',
] as const

export const CLIENTES_REALES = [
  'DRISCOLLS OPERACIONES', 'BERRYMEX AGROSOLUCIONES', 'AGRONATURA SUPPLY',
  'NATURESWEET INVERNADEROS', 'BIOPARQUES DE OCCIDENTE', 'AGRO VIVA',
  'AGRONEGOCIOS ARAN', 'HORTICOLA HERES', 'PIMIENTOS SELECTOS',
  'BELL PEPPER LOVERS', 'PRODUCTORA HASSIBA', 'NATURAL FOOD PLANET',
  'PRODUCTORES HRG', 'TECNOLOGIA AGRICOLA PRODUCTIVA', 'GENERAL FRESH',
  'LA CIMA PRODUCE', 'SUREXPORT', 'ABA BERRIES', 'ABA FRUTILLAS',
  'AGRICOLA EL RINCON DE LAS PALMAS', 'AGRICOLA GLORIA LILIA',
  'AVICOLA GLEZ GLEZ', 'CONSTRUCCIONES Y TUBERIAS DEL CENTRO',
  'GABRIEL VARGAS CISNEROS', 'LORENA PELAYO DE JESUS', 'VENTAS AL PUBLICO',
]

export interface LineaReal {
  id: string
  nombre: string
  proceso: string
  emoji: string
}

export const LINEAS_REALES: LineaReal[] = [
  { id: 'LC1', nombre: 'Costura 1',    proceso: 'costura',     emoji: '🧵' },
  { id: 'LC2', nombre: 'Costura 2',    proceso: 'costura',     emoji: '🧵' },
  { id: 'LC3', nombre: 'Costura 3',    proceso: 'costura',     emoji: '🧵' },
  { id: 'LC4', nombre: 'Costura 4',    proceso: 'costura',     emoji: '🧵' },
  { id: 'LK',  nombre: 'Corte',        proceso: 'corte',       emoji: '✂️' },
  { id: 'LP',  nombre: 'Perforadora',  proceso: 'perforacion', emoji: '🔨' },
  { id: 'LE',  nombre: 'Embobinado',   proceso: 'embobinado',  emoji: '📦' },
]

export const EMOJI_LINEA: Record<string, string> = {
  'LC1': '🧵', 'LC2': '🧵', 'LC3': '🧵', 'LC4': '🧵',
  'LK': '✂️', 'LP': '🔨', 'LE': '📦', 'LC': '🧵',
  'Costura 1': '🧵', 'Costura 2': '🧵', 'Costura 3': '🧵', 'Costura 4': '🧵',
  'Perforadora': '🔨', 'Corte': '✂️', 'Embobinado': '📦', 'Confección': '🪡', 'Montacargas': '🚛',
}

export const EMOJI_PROCESO: Record<string, string> = {
  corte: '✂️', perforacion: '🔨', costura: '🧵', embobinado: '📦',
}

export const EMOJI_PROBLEMA: Record<string, string> = {
  falla: '🔧', 'sin-material': '📦', 'sin-hilo': '🧵', 'sin-luz': '💡',
  montacargas: '🚛', comida: '🍽️', bano: '🚻', otro: '❓',
}

export interface RoleAvatar {
  color: string
  initial: string
}

export const ROLE_PROFILES: Record<string, { avatar: RoleAvatar; name: string }> = {
  produccion:  { avatar: { color: '#5d4037', initial: 'C' }, name: 'Carlos A.' },
  almacen:     { avatar: { color: '#283593', initial: 'A' }, name: 'Alberto O.' },
  operaciones: { avatar: { color: '#01579b', initial: 'V' }, name: 'Víctor G.' },
  cobranza:    { avatar: { color: '#bf360c', initial: 'M' }, name: 'María L.' },
  director:    { avatar: { color: '#1b5e20', initial: 'V' }, name: 'Víctor F. G.' },
}
