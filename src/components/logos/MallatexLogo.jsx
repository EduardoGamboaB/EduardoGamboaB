/* eslint-disable @next/next/no-img-element */
import { LOGO_FULL_URL, LOGO_SYMBOL_URL } from '@/lib/brand'

export function MallatexLogo({ size = 36, variant = 'full', invert = false }) {
  const filterStyle = invert ? { filter: 'brightness(1.15) contrast(1.05)' } : {}
  if (variant === 'symbol') {
    return (
      <img
        src={LOGO_SYMBOL_URL}
        alt="Mallatex"
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', ...filterStyle }}
      />
    )
  }
  return (
    <img
      src={LOGO_FULL_URL}
      alt="Mallatex - Protegemos lo que siembras"
      style={{ height: size * 1.1, width: 'auto', objectFit: 'contain', display: 'block', ...filterStyle }}
    />
  )
}
