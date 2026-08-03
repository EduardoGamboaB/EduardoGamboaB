import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Captura de leads"
      subtitle="Registro manual de prospectos en evento"
      code="MT-LEAD-004"
      endpoint={"/api/events"}
      note="Formulario de captura rápida. Envía a POST /api/leads asociando el evento activo."
    />
  )
}
