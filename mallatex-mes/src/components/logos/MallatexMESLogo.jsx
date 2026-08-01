/* eslint-disable @next/next/no-img-element */
import { LOGO_FULL_URL, brand, fontDisplay } from '@/lib/brand'

export function MallatexMESLogo({ size = 36, invert = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img
        src={LOGO_FULL_URL}
        alt="Mallatex"
        style={{
          height: size * 1.1,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          filter: invert ? 'brightness(1.15) contrast(1.05)' : 'none',
        }}
      />
      <span
        style={{
          ...fontDisplay,
          fontWeight: 800,
          fontSize: size * 0.42,
          padding: '3px 9px',
          background: brand.red,
          color: brand.white,
          letterSpacing: '0.12em',
          borderRadius: 2,
          lineHeight: 1,
        }}
      >
        MES
      </span>
    </div>
  )
}
