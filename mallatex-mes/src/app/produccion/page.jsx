import { ProduccionApp } from '@/components/apps/ProduccionApp'

// Server component — recibe searchParams nativamente.
// Permite ?ia=chat|alerts|insights|forecasts para deep linking del drawer IA.
export default function ProduccionPage({ searchParams }) {
  return <ProduccionApp iaOpenTab={searchParams?.ia} />
}
