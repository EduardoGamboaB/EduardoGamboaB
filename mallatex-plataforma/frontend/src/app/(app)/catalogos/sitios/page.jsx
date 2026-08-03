import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Sitios / geocercas"
      subtitle="Ubicaciones y radios de geocerca"
      code="MT-CAT-SIT"
      endpoint={"/api/sites"}
      
    />
  )
}
