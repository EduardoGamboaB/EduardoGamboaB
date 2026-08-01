import { OperacionesApp } from '@/components/apps/OperacionesApp'

export default function OperacionesPage({ searchParams }) {
  return <OperacionesApp iaOpenTab={searchParams?.ia} />
}
