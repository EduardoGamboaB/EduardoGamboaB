import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Módulos"
      subtitle="Catálogo de módulos por superficie"
      code="MT-CFG-MOD"
      endpoint={"/api/access/catalog?surface=web"}
      
    />
  )
}
