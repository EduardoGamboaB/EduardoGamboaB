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
  LayoutGrid, Factory, Warehouse, Settings2, HandCoins, LineChart, ClipboardCheck,
  UserPlus, Gift, PieChart, CalendarDays,
  Contact, Clock, Fingerprint, Package, MapPin, ShieldCheck,
  UserCog, KeyRound, Boxes, Lock, SlidersHorizontal,
  Images, ClipboardList, Megaphone, Camera,
} from 'lucide-react'

// Orden canónico de los grupos en la barra lateral. Cada grupo corresponde a
// un área de la empresa; los módulos viven en el área que los opera:
//   Inicio → Asistencia → RH → Nómina (personas) · Comercial → Marketing →
//   Eventos y Leads (mercado) · Producción (planta) · Administración (sistema).
export const GROUP_ORDER = [
  'Inicio',
  'Asistencia',
  'Recursos Humanos',
  'Nómina',
  'Comercial',
  'Marketing',
  'Eventos y Leads',
  'Producción (MES)',
  'Administración',
]

// key -> { label, grp, href, icon }
export const MODULES = {
  // ---- Inicio -------------------------------------------------------------
  dashboard: { label: 'Tablero', grp: 'Inicio', href: '/dashboard', icon: LayoutDashboard },

  // ---- Asistencia (control diario y su infraestructura) -------------------
  attendance: { label: 'Asistencia diaria', grp: 'Asistencia', href: '/asistencia', icon: CalendarClock },
  incidents: { label: 'Incidencias', grp: 'Asistencia', href: '/incidencias', icon: AlertTriangle },
  overtime: { label: 'Tiempo extra', grp: 'Asistencia', href: '/tiempo-extra', icon: Timer },
  checador: { label: 'Checador', grp: 'Asistencia', href: '/catalogos/checador', icon: Fingerprint },
  sites: { label: 'Sitios / geocercas', grp: 'Asistencia', href: '/catalogos/sitios', icon: MapPin },

  // ---- Recursos Humanos (gestión de personas) -----------------------------
  employees: { label: 'Empleados', grp: 'Recursos Humanos', href: '/catalogos/empleados', icon: Contact },
  schedules: { label: 'Horarios', grp: 'Recursos Humanos', href: '/catalogos/horarios', icon: Clock },
  'rh-vacaciones': { label: 'Vacaciones', grp: 'Recursos Humanos', href: '/rh/vacaciones', icon: Plane },
  'rh-tickets': { label: 'Tickets RH', grp: 'Recursos Humanos', href: '/rh/tickets', icon: Ticket },
  'rh-indicadores': { label: 'Indicadores RH', grp: 'Recursos Humanos', href: '/rh/indicadores', icon: BarChart3 },

  // ---- Nómina (cálculo y pago) --------------------------------------------
  periods: { label: 'Periodos / NOI', grp: 'Nómina', href: '/periodos', icon: CalendarRange },
  variablepay: { label: 'Percepciones variables', grp: 'Nómina', href: '/percepciones', icon: Wallet },
  'rh-recibos': { label: 'Recibos de nómina', grp: 'Nómina', href: '/rh/recibos', icon: BadgeDollarSign },

  // ---- Comercial (CRM y su catálogo) --------------------------------------
  'crm-clientes': { label: 'Clientes', grp: 'Comercial', href: '/crm/clientes', icon: Users },
  'crm-objetivos': { label: 'Objetivos', grp: 'Comercial', href: '/crm/objetivos', icon: Target },
  'crm-administrativo': { label: 'Viáticos y gastos', grp: 'Comercial', href: '/crm/administrativo', icon: Receipt },
  'crm-facturacion': { label: 'Facturación', grp: 'Comercial', href: '/crm/facturacion', icon: FileText },
  products: { label: 'Catálogo de productos', grp: 'Comercial', href: '/productos', icon: Package },

  // ---- Marketing (planear → producir → difundir → surtir) -----------------
  'mkt-calendario': { label: 'Calendario de campañas', grp: 'Marketing', href: '/marketing/calendario', icon: CalendarDays },
  'mkt-banco': { label: 'Banco de contenido', grp: 'Marketing', href: '/marketing/banco', icon: Images },
  'mkt-publicaciones': { label: 'Publicaciones', grp: 'Marketing', href: '/marketing/publicaciones', icon: Megaphone },
  'mkt-formatos': { label: 'Solicitudes de formatos', grp: 'Marketing', href: '/marketing/formatos', icon: ClipboardList },
  'mkt-aportes': { label: 'Aportes de campo', grp: 'Marketing', href: '/marketing/aportes', icon: Camera },
  'mkt-impresos': { label: 'Inventario de impresos', grp: 'Marketing', href: '/marketing/impresos', icon: Boxes },

  // ---- Eventos y Leads (Anaberries) ---------------------------------------
  'leads-eventos': { label: 'Eventos', grp: 'Eventos y Leads', href: '/leads/eventos', icon: CalendarDays },
  'leads-captura': { label: 'Captura de leads', grp: 'Eventos y Leads', href: '/leads/captura', icon: UserPlus },
  'leads-sorteo': { label: 'Sorteo', grp: 'Eventos y Leads', href: '/leads/sorteo', icon: Gift },
  'leads-dashboard': { label: 'Dashboard de leads', grp: 'Eventos y Leads', href: '/leads/dashboard', icon: PieChart },

  // ---- Producción (MES) ---------------------------------------------------
  'mes-tablero': { label: 'Tablero de producción', grp: 'Producción (MES)', href: '/mes/tablero', icon: LayoutGrid },
  'mes-produccion': { label: 'Jefe de producción', grp: 'Producción (MES)', href: '/mes/produccion', icon: Factory },
  'mes-operaciones': { label: 'Operaciones', grp: 'Producción (MES)', href: '/mes/operaciones', icon: Settings2 },
  'mes-almacen': { label: 'Almacén', grp: 'Producción (MES)', href: '/mes/almacen', icon: Warehouse },
  'mes-inventario': { label: 'Inventario físico', grp: 'Producción (MES)', href: '/mes/inventario', icon: ClipboardCheck },
  'mes-cobranza': { label: 'Cobranza', grp: 'Producción (MES)', href: '/mes/cobranza', icon: HandCoins },
  'mes-direccion': { label: 'Dirección', grp: 'Producción (MES)', href: '/mes/direccion', icon: LineChart },

  // ---- Administración del sistema -----------------------------------------
  users: { label: 'Usuarios', grp: 'Administración', href: '/config/usuarios', icon: UserCog },
  roles: { label: 'Roles', grp: 'Administración', href: '/config/roles', icon: KeyRound },
  modulos: { label: 'Módulos', grp: 'Administración', href: '/config/modulos', icon: Boxes },
  permisos: { label: 'Permisos', grp: 'Administración', href: '/config/permisos', icon: Lock },
  asignacion: { label: 'Asignación de acceso', grp: 'Administración', href: '/config/asignacion', icon: SlidersHorizontal },
  audit: { label: 'Auditoría', grp: 'Administración', href: '/auditoria', icon: ShieldCheck },
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
