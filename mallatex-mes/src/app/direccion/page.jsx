import { DirectorApp } from '@/components/apps/DirectorApp'

export default function DireccionPage({ searchParams }) {
  return <DirectorApp iaOpenTab={searchParams?.ia} />
}
