import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Tiempo extra"
      subtitle="Horas extra autorizadas y su cálculo"
      code="MT-OP-004"
      endpoint={"/api/overtime"}
      
    />
  )
}
