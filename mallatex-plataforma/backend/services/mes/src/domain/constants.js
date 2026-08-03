/**
 * Vocabulario de dominio del MES, extraído del sistema cliente original
 * (mallatex-mes/src/lib/constants.js) y de los Excel reales de Mallatex.
 * NO inventar valores nuevos: refleja los procesos formales MT-PC-001/002/003.
 */

// Tipos de operador A/B/C/D según competencias (MT-PC-003, política 2).
export const OPERATOR_TYPES = ['A', 'B', 'C', 'D'];

// 4 procesos de producción documentados.
export const PROCESOS_PRODUCCION = ['corte', 'perforacion', 'costura', 'embobinado'];

// 4 categorías de material (MT-PC-003, política 8).
export const CATEGORIAS_MATERIAL = ['prima', 'sobrante', 'defecto', 'desperdicio'];

// Estados de pedido alineados al Excel real de Mallatex.
export const ESTADOS_PEDIDO = [
  'cobranza-pendiente',
  'liberado',
  'stock-faltante',
  'compra-pendiente',
  'material-egresado',
  'en-produccion',
  'terminado',
  'entregado',
  'detenido',
];

// Formas de entrega reales (Excel de planeación).
export const FORMAS_ENTREGA = [
  'ALMACEN',
  'MALLATEX',
  'MALLATEX envía campo',
  'PAQUETERIA',
  'TRES GUERRAS',
];

// Líneas reales con códigos del Excel: LC1-LC4 (costura), LK (corte), LP (perforación), LE (embobinado).
export const LINEAS_REALES = [
  { code: 'LC1', name: 'Costura 1', type: 'costura' },
  { code: 'LC2', name: 'Costura 2', type: 'costura' },
  { code: 'LC3', name: 'Costura 3', type: 'costura' },
  { code: 'LC4', name: 'Costura 4', type: 'costura' },
  { code: 'LK', name: 'Corte', type: 'corte' },
  { code: 'LP', name: 'Perforadora', type: 'perforacion' },
  { code: 'LE', name: 'Embobinado', type: 'embobinado' },
];

// Estados considerados "en piso" para el tablero de producción.
export const ESTADOS_ACTIVOS = ['liberado', 'material-egresado', 'en-produccion'];
