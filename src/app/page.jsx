import { ProfileSelector } from '@/components/selector/ProfileSelector'

// Entry point — el ProfileSelector es client porque usa <Link> y onMouseEnter,
// pero esta page puede ser server (no necesita 'use client').
export default function HomePage() {
  return <ProfileSelector />
}
