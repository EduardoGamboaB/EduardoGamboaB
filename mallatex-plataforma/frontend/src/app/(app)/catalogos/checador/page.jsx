import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Checador"
      subtitle="Dispositivos biométricos de asistencia"
      code="MT-CAT-CHK"
      endpoint={"/api/devices"}
      
    />
  )
}
