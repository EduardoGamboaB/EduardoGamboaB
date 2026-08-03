import { ModuleScaffold } from '@/components/ModuleScaffold'

export default function Page() {
  return (
    <ModuleScaffold
      title="Facturación"
      subtitle="Facturas y estatus de cobro"
      code="MT-CRM-004"
      endpoint={null}
      note="Integración de facturación (CFDI). Pendiente de endpoint dedicado."
    />
  )
}
