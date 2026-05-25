import { brand, fontDisplay, fontMono } from '@/mes/lib/brand'
import { ProcessTag } from '@/mes/components/ui/ProcessTag'

export function Topbar({
  crumbs,
  title,
  actions,
  processCode,
}: {
  crumbs: React.ReactNode
  title: string
  actions?: React.ReactNode
  processCode?: string
}) {
  return (
    <div
      style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${brand.line}`,
        background: 'white',
      }}
    >
      <div>
        <div
          style={{
            ...fontMono,
            fontSize: 10,
            color: '#888',
            letterSpacing: '0.2em',
            marginBottom: 6,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 600,
          }}
        >
          {crumbs} {processCode && <ProcessTag code={processCode} />}
        </div>
        <h4 style={{ ...fontDisplay, fontWeight: 800, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
          {title}
        </h4>
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
