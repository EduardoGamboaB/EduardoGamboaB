'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// Shell autenticado responsivo. Protege rutas: sin sesión -> /login. El menú se
// arma con los `modules` de la sesión (matriz de acceso). Drawer off-canvas en
// móvil/tablet; sidebar persistente >=1024px (vía CSS).
export function AppShell({ children }) {
  const { session, loading, modules } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [drawer, setDrawer] = useState(false)

  // Cierra el drawer al navegar.
  useEffect(() => {
    setDrawer(false)
  }, [pathname])

  useEffect(() => {
    if (!loading && !session) router.replace('/login')
  }, [loading, session, router])

  if (loading) {
    return (
      <div className="state" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div><div className="spinner" />Cargando sesión…</div>
      </div>
    )
  }
  if (!session) return null

  return (
    <div className="shell">
      <Sidebar modules={modules} open={drawer} onClose={() => setDrawer(false)} />
      <div className={`scrim${drawer ? ' show' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className="content">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="view">{children}</main>
      </div>
    </div>
  )
}
