import { AppShell } from '@/components/AppShell'

// Layout del grupo autenticado: envuelve todas las rutas de módulos con el
// shell responsivo (sidebar/drawer dirigido por la matriz de acceso).
export default function AppGroupLayout({ children }) {
  return <AppShell>{children}</AppShell>
}
