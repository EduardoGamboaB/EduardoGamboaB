'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Clock, CheckCircle2, FileText, Download, Check, Eye } from 'lucide-react'
import { brand, fontBody, fontMono } from '@/mes/lib/brand'
import { ROLE_PROFILES } from '@/mes/lib/constants'
import { useApp } from '@/mes/lib/store'
import { WebShell, MenuItem } from '@/mes/components/shell/WebShell'
import { Topbar } from '@/mes/components/shell/Topbar'
import { Btn } from '@/mes/components/shell/Btn'
import { Stat } from '@/mes/components/shell/Stat'
import { Panel } from '@/mes/components/shell/Panel'
import { Table } from '@/mes/components/shell/Table'
import { Badge } from '@/mes/components/ui/Badge'
import { OrderStatusPill } from '@/mes/components/ui/OrderStatusPill'

export function CobranzaApp() {
  const router = useRouter()
  const onExit = () => router.push('/mes')
  const [view, setView] = useState('panel')
  const { orders, liberarPedido } = useApp()

  const menuItems: MenuItem[] = [
    { full: true, hint: true, id: 'panel', emoji: '📊', icon: BarChart3, label: 'Panel' },
    { id: 'pendientes', emoji: '⏰', icon: Clock, label: 'Por liberar', badge: orders.filter((o) => !o.pagoConfirmado).length },
    { id: 'liberados', emoji: '✅', icon: CheckCircle2, label: 'Liberados' },
    { id: 'historial', emoji: '📋', icon: FileText, label: 'Historial' },
  ]

  return (
    <WebShell perfil="Cobranza" profileData={ROLE_PROFILES.cobranza} currentView={view} onChangeView={setView} onExit={onExit} menuItems={menuItems}>
      {view === 'panel' && (
        <>
          <Topbar crumbs="Cobranza / Panel" title="Cobranza y Facturación"
            actions={<Btn variant="ghost" icon={Download}>Reporte</Btn>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 18, borderRadius: 4, marginBottom: 20, borderLeft: `3px solid ${brand.red}` }}>
              <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.2em', color: brand.red, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Política — MT-PC-003 directiva general</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#444' }}>
                <b>Ningún pedido pasa a producción sin confirmar pago.</b> Verificar liquidación o autorización de crédito antes de liberar. El pedido se detiene hasta cambio de estatus.
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Por liberar" value={orders.filter((o) => !o.pagoConfirmado).length} variant="warn" />
              <Stat label="Liberados hoy" value={orders.filter((o) => o.pagoConfirmado).length} variant="ok" />
              <Stat label="En producción" value={orders.filter((o) => o.estado === 'en-produccion').length} variant="red" />
              <Stat label="Entregados mes" value={orders.filter((o) => o.estado === 'entregado').length} />
            </div>
            <Panel title="Pedidos pendientes de liberación" code="MT-PC-003 directiva">
              <Table cols={['Pedido', 'Cliente', 'Producto', 'M²', 'Compromiso', 'Pago', 'Acción']}
                rows={orders.filter((o) => !o.pagoConfirmado).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente,
                  `${o.material} ${o.medida}`,
                  `${o.m2.toLocaleString()} m²`,
                  o.compromiso,
                  <Badge key="pa" variant="warn">Pendiente</Badge>,
                  <div key="b" style={{ display: 'flex', gap: 6 }}>
                    <Btn variant="ok" icon={Check} onClick={() => {
                      if (confirm(`¿Confirmar pago del pedido ${o.id} y liberar a producción?`)) {
                        liberarPedido(o.id)
                        alert(`Pedido ${o.id} liberado.\nProducción puede programarlo.`)
                      }
                    }}>Liberar</Btn>
                    <Btn variant="ghost" icon={Eye}>Ver</Btn>
                  </div>,
                ])} />
            </Panel>
            <Panel title="Pedidos recientemente liberados">
              <Table cols={['Pedido', 'Cliente', 'Producto', 'Estado actual', 'Compromiso']}
                rows={orders.filter((o) => o.pagoConfirmado).slice(0, 5).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente,
                  `${o.material} ${o.medida}`,
                  <OrderStatusPill key="s" estado={o.estado} />,
                  o.compromiso,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'pendientes' && (
        <>
          <Topbar crumbs="Cobranza / Pendientes" title="Pedidos por liberar" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title={`${orders.filter((o) => !o.pagoConfirmado).length} pedidos esperando liberación`}>
              <Table cols={['Pedido', 'Cliente', 'Producto', 'M²', 'Compromiso', '']}
                rows={orders.filter((o) => !o.pagoConfirmado).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente, `${o.material} ${o.medida}`, `${o.m2.toLocaleString()} m²`, o.compromiso,
                  <Btn key="b" variant="ok" icon={Check} onClick={() => {
                    liberarPedido(o.id)
                    alert(`Pedido ${o.id} liberado.`)
                  }}>Liberar</Btn>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'liberados' && (
        <>
          <Topbar crumbs="Cobranza / Liberados" title="Pedidos liberados" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Pedidos con pago confirmado">
              <Table cols={['Pedido', 'Cliente', 'Producto', 'Estado actual', 'Compromiso']}
                rows={orders.filter((o) => o.pagoConfirmado).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente, `${o.material} ${o.medida}`,
                  <OrderStatusPill key="s" estado={o.estado} />,
                  o.compromiso,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'historial' && (
        <>
          <Topbar crumbs="Cobranza / Historial" title="Historial de liberaciones" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Liberaciones del mes">
              <Table cols={['Fecha', 'Pedido', 'Cliente', 'Monto', 'Tipo', 'Resp.']}
                rows={orders.filter((o) => o.pagoConfirmado).slice(0, 8).map((o, i) => [
                  `2026-05-${20 - i}`,
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente,
                  `$${(o.m2 * 12).toLocaleString()}`,
                  i % 2 === 0 ? 'Liquidación' : 'Crédito',
                  'María L.',
                ])} />
            </Panel>
          </div>
        </>
      )}
    </WebShell>
  )
}
