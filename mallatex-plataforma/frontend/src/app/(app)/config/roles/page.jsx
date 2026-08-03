import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Roles"
      subtitle="Roles administrativos de la plataforma"
      code="MT-CFG-ROL"
      endpoint={null}
      note="Los roles y sus módulos se editan en Asignación de acceso."
    />
  )
}
