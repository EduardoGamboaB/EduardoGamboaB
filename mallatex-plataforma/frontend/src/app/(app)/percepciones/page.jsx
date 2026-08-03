import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Percepciones variables"
      subtitle="Conceptos variables de nómina (comisiones, kilometraje, costura)"
      code="MT-NOI-002"
      endpoint={"/api/variable-concepts"}
      
    />
  )
}
