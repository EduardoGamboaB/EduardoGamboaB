import { CobranzaApp } from '@/components/apps/CobranzaApp'

export default function CobranzaPage({ searchParams }) {
  return <CobranzaApp iaOpenTab={searchParams?.ia} />
}
