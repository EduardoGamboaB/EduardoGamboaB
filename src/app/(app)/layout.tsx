import { Sidebar } from '@/components/shell/Sidebar'
import { BottomNav } from '@/components/shell/BottomNav'
import { Header } from '@/components/shell/Header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // En una app real: const session = await auth(); if (!session) redirect('/login')
  // Para esta demo dejamos el shell abierto.
  const userName = 'Administrador Mallatex'
  const userRole = 'Admin'

  return (
    <div className="min-h-dvh bg-mallatex-soil-50">
      <Sidebar />
      <div className="md:pl-64">
        <Header userName={userName} userRole={userRole} />
        <main className="px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-10 animate-in">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
