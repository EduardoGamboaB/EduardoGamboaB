import { brand, fontMono } from '@/mes/lib/brand'

export function ProcessTag({ code }: { code: string }) {
  return (
    <span
      style={{
        ...fontMono,
        fontSize: 9,
        letterSpacing: '0.15em',
        color: brand.red,
        fontWeight: 700,
        padding: '3px 7px',
        border: `1px solid ${brand.red}`,
        borderRadius: 4,
        textTransform: 'uppercase',
      }}
    >
      {code}
    </span>
  )
}
