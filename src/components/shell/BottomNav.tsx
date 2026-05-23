'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'

export function BottomNav() {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((i) => i.mobile)

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-mallatex-soil-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                  active ? 'text-mallatex-green-700' : 'text-mallatex-soil-500',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5',
                    active ? 'text-mallatex-green-700' : 'text-mallatex-soil-500',
                  )}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
