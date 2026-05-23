import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: 'green' | 'sun' | 'sky' | 'soil' | 'red'
  trend?: { value: number; positive?: boolean }
}

const TONES = {
  green: 'bg-mallatex-green-100 text-mallatex-green-800',
  sun: 'bg-mallatex-sun-300/40 text-mallatex-sun-700',
  sky: 'bg-mallatex-sky-300/40 text-mallatex-sky-700',
  soil: 'bg-mallatex-soil-100 text-mallatex-soil-700',
  red: 'bg-red-100 text-red-700',
}

export function KPICard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'green',
  trend,
}: KPICardProps) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-mallatex-soil-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-mallatex-soil-900 sm:text-3xl">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-mallatex-soil-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2', TONES[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              'font-semibold',
              trend.positive ? 'text-mallatex-green-700' : 'text-red-600',
            )}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-mallatex-soil-500">vs. periodo anterior</span>
        </div>
      )}
    </div>
  )
}
