'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { NAV_ITEMS } from './nav-items'

const GRUPO_LABELS = {
  principal: 'Principal',
  planta: 'Planta',
  administracion: 'Administración',
} as const

export function Sidebar() {
  const pathname = usePathname()
  const grupos = ['principal', 'planta', 'administracion'] as const

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:border-r md:border-mallatex-soil-200 md:bg-white">
      <div className="px-5 py-5 border-b border-mallatex-soil-200">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {grupos.map((g) => {
          const items = NAV_ITEMS.filter((i) => i.grupo === g)
          if (items.length === 0) return null
          return (
            <div key={g}>
              <h6 className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-mallatex-soil-500">
                {GRUPO_LABELS[g]}
              </h6>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname.startsWith(item.href)
                  const Icon = item.icon
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          active
                            ? 'bg-mallatex-green-100 text-mallatex-green-800'
                            : 'text-mallatex-soil-700 hover:bg-mallatex-soil-100',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            active ? 'text-mallatex-green-700' : 'text-mallatex-soil-500',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
      <div className="border-t border-mallatex-soil-200 p-4">
        <div className="rounded-lg bg-mallatex-green-50 p-3">
          <p className="text-[11px] font-semibold text-mallatex-green-800 uppercase tracking-wider">
            Tejidos Técnicos Mallatex
          </p>
          <p className="text-[10px] text-mallatex-green-700/80 mt-1 leading-snug">
            Zapopan, Jal. · Mallas, cubresuelo y agrotextiles para agricultura protegida.
          </p>
        </div>
      </div>
    </aside>
  )
}
