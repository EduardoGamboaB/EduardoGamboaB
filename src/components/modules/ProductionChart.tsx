'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'

const data = [
  { dia: 'Lun', cubresuelo: 1800, antiafido: 600, antigranizo: 900, raschel: 400, manta: 280 },
  { dia: 'Mar', cubresuelo: 2100, antiafido: 720, antigranizo: 750, raschel: 500, manta: 320 },
  { dia: 'Mié', cubresuelo: 1600, antiafido: 540, antigranizo: 1100, raschel: 380, manta: 250 },
  { dia: 'Jue', cubresuelo: 2400, antiafido: 810, antigranizo: 980, raschel: 620, manta: 410 },
  { dia: 'Vie', cubresuelo: 2200, antiafido: 760, antigranizo: 1020, raschel: 540, manta: 380 },
  { dia: 'Sáb', cubresuelo: 1400, antiafido: 420, antigranizo: 680, raschel: 300, manta: 200 },
  { dia: 'Hoy', cubresuelo: 1900, antiafido: 690, antigranizo: 1100, raschel: 590, manta: 340 },
]

export function ProductionChart() {
  return (
    <div className="h-64 -ml-3 sm:ml-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E4E4E7', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="cubresuelo"  name="Cubresuelo"  stackId="a" fill="#2D7A3E" />
          <Bar dataKey="antiafido"   name="Antiáfido"   stackId="a" fill="#4CAF50" />
          <Bar dataKey="antigranizo" name="Antigranizo" stackId="a" fill="#81C784" />
          <Bar dataKey="raschel"     name="Raschel"     stackId="a" fill="#FFA726" />
          <Bar dataKey="manta"       name="Manta"       stackId="a" fill="#29B6F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
