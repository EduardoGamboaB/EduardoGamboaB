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
  { dia: 'Lun', sombra: 1800, antiafidos: 600, cubreSuelos: 900, manta: 400 },
  { dia: 'Mar', sombra: 2100, antiafidos: 720, cubreSuelos: 750, manta: 500 },
  { dia: 'Mié', sombra: 1600, antiafidos: 540, cubreSuelos: 1100, manta: 380 },
  { dia: 'Jue', sombra: 2400, antiafidos: 810, cubreSuelos: 980, manta: 620 },
  { dia: 'Vie', sombra: 2200, antiafidos: 760, cubreSuelos: 1020, manta: 540 },
  { dia: 'Sáb', sombra: 1400, antiafidos: 420, cubreSuelos: 680, manta: 300 },
  { dia: 'Hoy', sombra: 1900, antiafidos: 690, cubreSuelos: 1100, manta: 590 },
]

export function ProductionChart() {
  return (
    <div className="h-64 -ml-3 sm:ml-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
          <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E4E4E7',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="sombra" name="Malla sombra" stackId="a" fill="#2D7A3E" radius={[0, 0, 0, 0]} />
          <Bar dataKey="antiafidos" name="Antiáfidos" stackId="a" fill="#4CAF50" />
          <Bar dataKey="cubreSuelos" name="Cubre suelos" stackId="a" fill="#FFA726" />
          <Bar dataKey="manta" name="Manta térmica" stackId="a" fill="#29B6F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
