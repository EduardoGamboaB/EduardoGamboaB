// ---------------------------------------------------------------------------
// Registro del menú web UNIFICADO.
//
// Cada entrada mapea una CLAVE DE MÓDULO del catálogo del backend
// (identity.module_catalog, superficie 'web') a su ruta, grupo, etiqueta e
// icono. El menú que ve cada usuario se calcula filtrando este registro por el
// arreglo `modules` que devuelve /api/auth/me (o el login), es decir por la
// matriz de acceso (rol/perfil -> módulos). Ver buildMenu().
//
// Las claves y los grupos replican exactamente database/seed.js (WEB_MODULES).
// ---------------------------------------------------------------------------

import {
  LayoutDashboard, CalendarClock, AlertTriangle, Timer,
  CalendarRange, Wallet,
  Users, Target, Receipt, FileText,
  BadgeDollarSign, Plane, Ticket, BarChart3,
  LayoutGrid, Factory, Warehouse, Settings2, HandCoins, LineChart,
  UserPlus, Gift, PieChart, CalendarDays,
  Contact, Clock, Fingerprint, Package, MapPin, ShieldCheck,
  UserCog, KeyRound, Boxes, Lock, SlidersHorizontal,
} from 'lucide-react'

// Orden canónico de los grupos en la barra lateral.
export const GROUP_ORDER = [
  'Operación',
  'Nómina',
  'Comercial',
  'Recursos Humanos',
  'MES',
  'Leads',
  'Catálogos',
  'Administración',
  'Configuración',
]

// key -> { label, grp, href, icon }
export const MODULES = {
  // ---- Operación ----------------------------------------------------------
  dashboard: { label: 'Tablero', grp: 'Operación', href: '/dashboard', icon: LayoutDashboard },
  attendance: { label: 'Asistencia', grp: 'Operación', href: '/asistencia', icon: CalendarClock },
  incidents: { label: 'Incidencias', grp: 'Operación', href: '/incidencias', icon: AlertTriangle },
  overtime: { label: 'Tiempo extra', grp: 'Operación', href: '/tiempo-extra', icon: Timer },

  // ---- Nómina -------------------------------------------------------------
  periods: { label: 'Periodos / NOI', grp: 'Nómina', href: '/periodos', icon: CalendarRange },
  variablepay: { label: 'Percepciones variables', grp: 'Nómina', href: '/percepciones', icon: Wallet },

  // ---- Comercial ----------------------------------------------------------
  'crm-clientes': { label: 'Clientes', grp: 'Comercial', href: '/crm/clientes', icon: Users },
  'crm-objetivos': { label: 'Objetivos', grp: 'Comercial', href: '/crm/objetivos', icon: Target },
  'crm-administrativo': { label: 'Viáticos y gastos', grp: 'Comercial', href: '/crm/administrativo', icon: Receipt },
  'crm-facturacion': { label: 'Facturación', grp: 'Comercial', href: '/crm/facturacion', icon: FileText },

  // ---- Recursos Humanos ---------------------------------------------------
  'rh-recibos': { label: 'Recibos', grp: 'Recursos Humanos', href: '/rh/recibos', icon: BadgeDollarSign },
  'rh-vacaciones': { label: 'Vacaciones', grp: 'Recursos Humanos', href: '/rh/vacaciones', icon: Plane },
  'rh-tickets': { label: 'Tickets', grp: 'Recursos Humanos', href: '/rh/tickets', icon: Ticket },
  'rh-indicadores': { label: 'Indicadores', grp: 'Recursos Humanos', href: '/rh/indicadores', icon: BarChart3 },

  // ---- MES ----------------------------------------------------------------
  'mes-tablero': { label: 'Tablero de producción', grp: 'MES', href: '/mes/tablero', icon: LayoutGrid },
  'mes-produccion': { label: 'Jefe de producción', grp: 'MES', href: '/mes/produccion', icon: Factory },
  'mes-almacen': { label: 'Almacén', grp: 'MES', href: '/mes/almacen', icon: Warehouse },
  'mes-operaciones': { label: 'Operaciones', grp: 'MES', href: '/mes/operaciones', icon: Settings2 },
  'mes-cobranza': { label: 'Cobranza', grp: 'MES', href: '/mes/cobranza', icon: HandCoins },
  'mes-direccion': { label: 'Dirección', grp: 'MES', href: '/mes/direccion', icon: LineChart },

  // ---- Leads --------------------------------------------------------------
  'leads-captura': { label: 'Captura', grp: 'Leads', href: '/leads/captura', icon: UserPlus },
  'leads-sorteo': { label: 'Sorteo', grp: 'Leads', href: '/leads/sorteo', icon: Gift },
  'leads-dashboard': { label: 'Dashboard leads', grp: 'Leads', href: '/leads/dashboard', icon: PieChart },
  'leads-eventos': { label: 'Eventos', grp: 'Leads', href: '/leads/eventos', icon: CalendarDays },

  // ---- Catálogos ----------------------------------------------------------
  employees: { label: 'Empleados', grp: 'Catálogos', href: '/catalogos/empleados', icon: Contact },
  schedules: { label: 'Horarios', grp: 'Catálogos', href: '/catalogos/horarios', icon: Clock },
  checador: { label: 'Checador', grp: 'Catálogos', href: '/catalogos/checador', icon: Fingerprint },
  products: { label: 'Productos', grp: 'Catálogos', href: '/productos', icon: Package },
  sites: { label: 'Sitios / geocercas', grp: 'Catálogos', href: '/catalogos/sitios', icon: MapPin },

  // ---- Administración -----------------------------------------------------
  audit: { label: 'Auditoría', grp: 'Administración', href: '/auditoria', icon: ShieldCheck },

  // ---- Configuración ------------------------------------------------------
  users: { label: 'Usuarios', grp: 'Configuración', href: '/config/usuarios', icon: UserCog },
  roles: { label: 'Roles', grp: 'Configuración', href: '/config/roles', icon: KeyRound },
  modulos: { label: 'Módulos', grp: 'Configuración', href: '/config/modulos', icon: Boxes },
  permisos: { label: 'Permisos', grp: 'Configuración', href: '/config/permisos', icon: Lock },
  asignacion: { label: 'Asignación de acceso', grp: 'Configuración', href: '/config/asignacion', icon: SlidersHorizontal },
}

/**
 * Construye el menú agrupado a partir de las claves de módulo del usuario.
 * @param {string[]} modules  claves efectivas (de /api/auth/me).
 * @returns {{ grp: string, items: Array }[]} grupos con sus items, en orden.
 */
export function buildMenu(modules = []) {
  const allowed = new Set(modules)
  const byGroup = new Map()
  for (const [key, def] of Object.entries(MODULES)) {
    if (!allowed.has(key)) continue
    if (!byGroup.has(def.grp)) byGroup.set(def.grp, [])
    byGroup.get(def.grp).push({ key, ...def })
  }
  return GROUP_ORDER
    .filter((g) => byGroup.has(g))
    .map((g) => ({ grp: g, items: byGroup.get(g) }))
}

/** Encuentra la definición de módulo cuya ruta coincide con el pathname. */
export function moduleByPath(pathname) {
  let best = null
  for (const [key, def] of Object.entries(MODULES)) {
    if (pathname === def.href || pathname.startsWith(def.href + '/')) {
      if (!best || def.href.length > best.def.href.length) best = { key, def }
    }
  }
  return best
}
