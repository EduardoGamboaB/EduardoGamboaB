import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Auditoría"
      subtitle="Bitácora de acciones del sistema"
      code="MT-ADM-AUD"
      endpoint={null}
      note="Registro de auditoría. Se conectará al servicio de bitácora."
    />
  )
}
