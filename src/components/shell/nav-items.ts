import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  PackageSearch,
  Boxes,
  ShieldCheck,
  BarChart3,
  Warehouse,
  Truck,
  Scissors,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Aparece en la barra inferior móvil (espacio limitado: 5 items) */
  mobile?: boolean
  /** Agrupación en sidebar de escritorio */
  grupo?: 'principal' | 'planta' | 'administracion'
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',        label: 'Dashboard',       icon: LayoutDashboard, mobile: true,  grupo: 'principal' },
  { href: '/pedidos',          label: 'Pedidos',         icon: ClipboardList,   mobile: true,  grupo: 'principal' },
  { href: '/produccion',       label: 'Producción',      icon: Factory,         mobile: true,  grupo: 'planta' },
  { href: '/control-mp',       label: 'Control MP',      icon: Scissors,                       grupo: 'planta' },
  { href: '/pedidos-almacen',  label: 'Ped. Almacén',    icon: Warehouse,                      grupo: 'planta' },
  { href: '/montacargas',      label: 'Montacargas',     icon: Truck,                          grupo: 'planta' },
  { href: '/catalogo',         label: 'Catálogo',        icon: PackageSearch,                  grupo: 'administracion' },
  { href: '/inventario',       label: 'Inventario',      icon: Boxes,           mobile: true,  grupo: 'administracion' },
  { href: '/calidad',          label: 'Calidad',         icon: ShieldCheck,                    grupo: 'administracion' },
  { href: '/reportes',         label: 'Reportes',        icon: BarChart3,       mobile: true,  grupo: 'administracion' },
]
