import { brand, fontDisplay } from '@/mes/lib/brand'
import { ESTADOS_PEDIDO } from '@/mes/lib/constants'

export function OrderStatusPill({ estado }: { estado: string }) {
  const s = Object.values(ESTADOS_PEDIDO).find((e) => e.id === estado) ?? ESTADOS_PEDIDO.LIBERADO
  return (
    <span
      style={{
        ...fontDisplay,
        fontWeight: 700,
        fontSize: 10,
        letterSpacing: '0.08em',
        padding: '4px 10px',
        borderRadius: 6,
        textTransform: 'uppercase',
        background: s.color,
        color: brand.white,
        display: 'inline-block',
      }}
    >
      {s.label}
    </span>
  )
}
