import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Operaciones"
      subtitle="Estado y asignación de líneas"
      code="MT-PC-OPS"
      endpoint={"/api/mes/lines"}
      note="Operación de líneas de producción."
    />
  )
}
