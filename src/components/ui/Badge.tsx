import { cn, estadoColor, estadoLabel } from '@/lib/utils'

export function Badge({
  children,
  className,
  estado,
}: {
  children?: React.ReactNode
  className?: string
  estado?: string
}) {
  if (estado) {
    return (
      <span className={cn('badge', estadoColor(estado), className)}>
        {estadoLabel(estado)}
      </span>
    )
  }
  return (
    <span className={cn('badge bg-mallatex-soil-100 text-mallatex-soil-700', className)}>
      {children}
    </span>
  )
}
