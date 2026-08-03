'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '@/lib/api'

// Raíz: enruta a /dashboard si hay sesión, o a /login.
export default function RootPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace(getToken() ? '/dashboard' : '/login')
  }, [router])
  return (
    <div className="state" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div><div className="spinner" />Cargando…</div>
    </div>
  )
}
