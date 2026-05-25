import { brand, fontBody, fontMono } from '@/mes/lib/brand'

export function Table({ cols, rows }: { cols: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', ...fontBody, fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                style={{
                  background: brand.paper,
                  ...fontMono,
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  color: '#777',
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderBottom: `1px solid ${brand.line}`,
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  fontWeight: 600,
                }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '12px 14px', borderBottom: `1px solid ${brand.line}` }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
