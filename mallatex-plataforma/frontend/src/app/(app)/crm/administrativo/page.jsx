import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Viáticos y gastos"
      subtitle="Comprobación de viáticos y gastos comerciales"
      code="MT-CRM-003"
      endpoint={null}
      note="Módulo comercial administrativo. Pendiente de endpoint dedicado en el gateway."
    />
  )
}
