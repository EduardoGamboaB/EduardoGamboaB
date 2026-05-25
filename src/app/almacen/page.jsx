import { AlmacenApp } from '@/components/apps/AlmacenApp'

export default function AlmacenPage({ searchParams }) {
  return <AlmacenApp iaOpenTab={searchParams?.ia} />
}
