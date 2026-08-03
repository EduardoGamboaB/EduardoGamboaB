'use client'

import { usePathname } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { moduleByPath } from '@/lib/menu'
import { useAuth } from '@/lib/auth'

export function Topbar({ onMenu }) {
  const pathname = usePathname()
  const { session, logout } = useAuth()
  const current = moduleByPath(pathname)
  const title = current?.def?.label || 'Mallatex'
  const grp = current?.def?.grp || 'Plataforma'
  const name = session?.name || 'Usuario'
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <header className="topbar">
      <button className="icon-btn menu-toggle" onClick={onMenu} aria-label="Abrir menú">
        <Menu size={22} />
      </button>
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{grp}</div>
      </div>
      <div className="topbar-spacer" />
      <div className="user-chip">
        <div className="user-meta right">
          <strong>{name}</strong>
          <small>{session?.role || session?.principal || ''}</small>
        </div>
        <div className="avatar">{initials || 'U'}</div>
      </div>
      <button className="icon-btn" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión">
        <LogOut size={20} />
      </button>
    </header>
  )
}
