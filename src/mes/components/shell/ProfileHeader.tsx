import { brand, fontDisplay, fontMono } from '@/mes/lib/brand'
import { RoleAvatar } from '@/mes/lib/constants'

export function ProfileHeader({
  avatar,
  name,
  role,
  badge = 'MES',
}: {
  avatar: RoleAvatar
  name: string
  role: string
  badge?: string
}) {
  return (
    <div
      style={{
        padding: '14px 14px',
        background: brand.redLight,
        border: `1px solid ${brand.red}`,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: '50%',
          background: avatar.color,
          color: 'white',
          display: 'grid',
          placeItems: 'center',
          ...fontDisplay,
          fontWeight: 900,
          fontSize: 22,
          flexShrink: 0,
          border: `2px solid ${brand.white}`,
          boxShadow: `0 0 0 2px ${avatar.color}`,
        }}
      >
        {avatar.initial}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.02em', color: brand.ink, lineHeight: 1 }}>{name}</div>
        <div style={{ ...fontMono, fontSize: 10, color: brand.red, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{role}</div>
      </div>
      {badge && (
        <div style={{ padding: '5px 9px', background: brand.red, color: 'white', borderRadius: 6, ...fontDisplay, fontWeight: 800, fontSize: 10, letterSpacing: '0.1em' }}>
          {badge}
        </div>
      )}
    </div>
  )
}
