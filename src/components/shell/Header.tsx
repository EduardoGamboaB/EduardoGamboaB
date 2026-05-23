'use client'

import { useState } from 'react'
import { Logo } from '@/components/Logo'
import { Bell, Search, User } from 'lucide-react'

export function Header({ userName, userRole }: { userName?: string; userRole?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <header
      className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-mallatex-soil-200"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Logo solo en móvil; en desktop ya está en Sidebar */}
        <div className="md:hidden">
          <Logo variant="mark" />
        </div>

        {/* Buscador (desktop) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mallatex-soil-500" />
            <input
              type="search"
              placeholder="Buscar pedido, OP, rollo o cliente…"
              className="input pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="relative p-2 rounded-lg hover:bg-mallatex-soil-100"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-mallatex-soil-700" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-mallatex-sun-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-mallatex-soil-100"
            >
              <div className="h-8 w-8 rounded-full bg-mallatex-green-700 text-white flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-mallatex-soil-900 leading-tight">
                  {userName ?? 'Invitado'}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-mallatex-soil-500">
                  {userRole ?? '—'}
                </p>
              </div>
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-48 card p-2 z-30">
                <a href="/perfil" className="block px-3 py-2 text-sm rounded-md hover:bg-mallatex-soil-100">
                  Mi perfil
                </a>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-mallatex-soil-100 text-red-600"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
