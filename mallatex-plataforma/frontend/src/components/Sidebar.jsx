'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { buildMenu } from '@/lib/menu'

// Barra lateral / drawer. Los items provienen EXCLUSIVAMENTE de `modules`
// (matriz de acceso): buildMenu() filtra el registro de módulos por las claves
// que el usuario tiene concedidas y las agrupa.
export function Sidebar({ modules, open, onClose }) {
  const pathname = usePathname()
  const groups = buildMenu(modules)

  return (
    <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Navegación principal">
      <div className="sidebar-brand">
        <div className="brand-mark">M</div>
        <div className="brand-text">
          <strong>MALLATEX</strong>
          <span>PLATAFORMA</span>
        </div>
        <button className="icon-btn brand-close" onClick={onClose} aria-label="Cerrar menú">
          <X size={20} />
        </button>
      </div>

      <nav className="nav">
        {groups.length === 0 && (
          <p className="muted" style={{ padding: '16px 12px', fontSize: 13 }}>
            Sin módulos asignados. Contacta al administrador.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.grp}>
            <div className="nav-group">{group.grp}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`nav-link${active ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <Icon size={18} />
                  <span className="lbl">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <p className="powered">
          <b>Mallatex</b> · Protegemos lo que siembras
        </p>
      </div>
    </aside>
  )
}
