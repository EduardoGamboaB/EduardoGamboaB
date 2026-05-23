import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  variant?: 'full' | 'mark'
  inverse?: boolean
}

/**
 * Logotipo Mallatex — versión SVG inspirada en la identidad de mallatex.com.mx.
 * Sustituir por el SVG oficial cuando esté disponible bajo public/brand/.
 */
export function Logo({ className, variant = 'full', inverse = false }: LogoProps) {
  const fg = inverse ? '#FFFFFF' : '#2D7A3E'
  const accent = inverse ? '#FFD180' : '#FFA726'

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* Símbolo: hoja sobre malla */}
        <rect x="2" y="2" width="32" height="32" rx="8" fill={fg} />
        <path
          d="M9 9h18M9 14h18M9 19h18M9 24h18M14 9v18M19 9v18M24 9v18"
          stroke={inverse ? '#143F1E' : '#E8F5E9'}
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M11 22c2.5-8 8-11 14-11-1 7-5 12-12 13-1 0-2-1-2-2z"
          fill={accent}
          opacity="0.95"
        />
        <path
          d="M11 22c3-4 7-7 13-10"
          stroke={inverse ? '#1F5E2E' : '#1F5E2E'}
          strokeWidth="0.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
      {variant === 'full' && (
        <div className="leading-tight">
          <div
            className={cn(
              'text-base font-bold tracking-tight',
              inverse ? 'text-white' : 'text-mallatex-green-800',
            )}
          >
            Mallatex
          </div>
          <div
            className={cn(
              'text-[10px] uppercase tracking-[0.18em]',
              inverse ? 'text-mallatex-green-100' : 'text-mallatex-soil-500',
            )}
          >
            Production Suite
          </div>
        </div>
      )}
    </div>
  )
}
