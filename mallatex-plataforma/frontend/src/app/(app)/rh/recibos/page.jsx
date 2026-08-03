import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Recibos"
      subtitle="Recibos de nómina timbrados"
      code="MT-RH-001"
      endpoint={null}
      note="Consulta y descarga de recibos. Se conectará al servicio de RH."
    />
  )
}
