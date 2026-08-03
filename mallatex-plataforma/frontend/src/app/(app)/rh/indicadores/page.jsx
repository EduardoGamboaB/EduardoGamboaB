import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Indicadores"
      subtitle="KPIs de recursos humanos"
      code="MT-RH-004"
      endpoint={"/api/dashboard"}
      note="Indicadores de RH derivados del tablero de asistencia."
    />
  )
}
