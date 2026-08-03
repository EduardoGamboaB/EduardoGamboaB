import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Tickets"
      subtitle="Mesa de ayuda de recursos humanos"
      code="MT-RH-003"
      endpoint={null}
      note="Tickets internos de RH. Se conectará al servicio de RH."
    />
  )
}
