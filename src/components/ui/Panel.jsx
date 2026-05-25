import { brand, fontDisplay } from '@/lib/brand'
import { ProcessTag } from './ProcessTag'

export function Panel({ title, filters, children, code, emoji }) {
  return (
    <div style={{ background: brand.white, border: `1px solid ${brand.line}`, marginBottom: 20, overflow: 'hidden', borderRadius: 10 }}>
      <div style={{
        padding: '14px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${brand.line}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
          <h5 style={{ ...fontDisplay, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</h5>
          {code && <ProcessTag code={code} />}
        </div>
        {filters && <div style={{ display: 'flex', gap: 4 }}>{filters}</div>}
      </div>
      {children}
    </div>
  )
}
