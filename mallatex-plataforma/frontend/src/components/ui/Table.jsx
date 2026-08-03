// Tabla responsiva: se envuelve en un contenedor con scroll-x propio para
// nunca desbordar el body en móvil.
export function Table({ cols, rows, empty = 'Sin registros' }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} style={c.align ? { textAlign: c.align } : undefined}>
                {typeof c === 'string' ? c : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} style={{ textAlign: 'center', color: '#888', padding: 28 }}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={cols[j] && cols[j].align ? { textAlign: cols[j].align } : undefined}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
