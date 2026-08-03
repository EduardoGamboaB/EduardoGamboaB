'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { moduleByPath } from '@/lib/menu'
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

  // Guard central de acceso: si la URL corresponde a un módulo del catálogo
  // que el sujeto NO tiene concedido, se muestra un aviso claro en lugar del
  // contenido (la API igualmente respondería 403; esto lo hace comprensible).
  const mod = moduleByPath(pathname)
  const denied = mod && Array.isArray(modules) && !modules.includes(mod.key)

  return (
    <div className="shell">
      <Sidebar modules={modules} open={drawer} onClose={() => setDrawer(false)} />
      <div className={`scrim${drawer ? ' show' : ''}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <div className="content">
        <Topbar onMenu={() => setDrawer(true)} />
        <main className="view">
          {denied ? (
            <div className="card" style={{ maxWidth: 520, margin: '40px auto', textAlign: 'center' }}>
              <div className="card-body">
                <h2 style={{ marginBottom: 8 }}>Sin acceso a este módulo</h2>
                <p className="muted">
                  Tu cuenta no tiene concedido «{mod.def.label}». Si lo necesitas,
                  solicita el acceso a un administrador (Configuración · Asignación de acceso).
                </p>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
