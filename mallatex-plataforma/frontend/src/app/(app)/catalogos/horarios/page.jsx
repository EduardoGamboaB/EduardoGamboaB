import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Horarios"
      subtitle="Turnos y horarios laborales"
      code="MT-CAT-HOR"
      endpoint={"/api/schedules"}
      
    />
  )
}
