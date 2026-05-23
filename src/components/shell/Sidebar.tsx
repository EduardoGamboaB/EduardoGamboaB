'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { NAV_ITEMS } from './nav-items'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 md:border-r md:border-mallatex-soil-200 md:bg-white">
      <div className="px-5 py-5 border-b border-mallatex-soil-200">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-mallatex-green-100 text-mallatex-green-800'
                  : 'text-mallatex-soil-700 hover:bg-mallatex-soil-100',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  active ? 'text-mallatex-green-700' : 'text-mallatex-soil-500',
                )}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-mallatex-soil-200 p-4">
        <div className="rounded-lg bg-mallatex-green-50 p-3">
          <p className="text-xs font-semibold text-mallatex-green-800">
            Agricultura protegida
          </p>
          <p className="text-[11px] text-mallatex-green-700/80 mt-1">
            Mallas, cubre suelos y agrotextiles para cultivos de alto valor.
          </p>
        </div>
      </div>
    </aside>
  )
}
