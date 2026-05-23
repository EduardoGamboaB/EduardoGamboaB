import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  PackageSearch,
  Boxes,
  ShieldCheck,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Aparece en la barra inferior móvil (espacio limitado: 5 items) */
  mobile?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList, mobile: true },
  { href: '/produccion', label: 'Producción', icon: Factory, mobile: true },
  { href: '/catalogo', label: 'Catálogo', icon: PackageSearch },
  { href: '/inventario', label: 'Inventario', icon: Boxes, mobile: true },
  { href: '/calidad', label: 'Calidad', icon: ShieldCheck },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, mobile: true },
]
