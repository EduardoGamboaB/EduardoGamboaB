import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Permisos"
      subtitle="Concesiones y revocaciones individuales"
      code="MT-CFG-PER"
      endpoint={null}
      note="Permisos finos por usuario. Se administran vía extra/revoked modules."
    />
  )
}
