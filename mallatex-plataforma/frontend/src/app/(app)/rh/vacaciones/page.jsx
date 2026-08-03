import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Vacaciones"
      subtitle="Solicitudes y saldos de vacaciones"
      code="MT-RH-002"
      endpoint={null}
      note="Gestión de vacaciones. Se conectará al servicio de RH."
    />
  )
}
