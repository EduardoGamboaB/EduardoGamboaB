'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { brand, fontBody, fontDisplay } from '@/lib/brand'
import { MallatexMESLogo } from '@/components/logos/MallatexMESLogo'
import { ProfileHeader } from '@/components/ui/ProfileHeader'
import { BentoCard, BentoSection } from '@/components/ui/BentoCard'

export function WebShell({ children, perfil, profileData, currentView, onChangeView, menuItems }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: brand.paper, ...fontBody }}>
      <aside style={{
        width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: brand.white, color: brand.ink,
        borderRight: `1px solid ${brand.line}`, boxShadow: '4px 0 16px -8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ height: 5, background: brand.red }} />
        <div style={{ padding: '18px 18px 8px' }}>
          <MallatexMESLogo size={24} />
        </div>

        {profileData && (
          <div style={{ padding: '8px 14px 4px' }}>
            <ProfileHeader avatar={profileData.avatar} name={profileData.name} role={perfil} />
          </div>
        )}

        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {menuItems.map((item, i) => {
              if (item.section) return <BentoSection key={i} label={item.section} emoji={item.sectionEmoji} />
              const active = currentView === item.id
              return (
                <BentoCard
                  key={i}
                  emoji={item.emoji} icon={item.icon}
                  label={item.label} sublabel={item.sublabel}
                  badge={item.badge} active={active} hint={item.hint}
                  onClick={() => item.id && onChangeView(item.id)}
                  span={item.full ? '2' : '1'}
                  size={item.full ? 'md' : 'sm'}
                />
              )
            })}
          </div>
        </nav>

        <Link href="/" style={{
          margin: 14, padding: '14px 12px',
          ...fontDisplay, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: brand.red, background: brand.redLight, border: `1px solid ${brand.red}`,
          borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          textDecoration: 'none',
        }}>
          <ArrowLeft size={14} /> Cambiar perfil
        </Link>
      </aside>
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>{children}</main>
    </div>
  )
}
