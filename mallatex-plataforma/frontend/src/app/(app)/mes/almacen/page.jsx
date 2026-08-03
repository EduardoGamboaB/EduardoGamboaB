import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Almacén"
      subtitle="Inventario de rollos y materia prima"
      code="MT-PC-ALM"
      endpoint={"/api/mes/orders"}
      note="Vista de almacén sobre las órdenes de producción."
    />
  )
}
