'use client'

// MT-PC-001 (Ingreso) + MT-PC-002 (Egreso) · Alberto O.
import { useState } from 'react'
import {
  BarChart3, PackagePlus, ClipboardCheck, PackageMinus, RefreshCw, Package, MapPin,
  Plus, Printer, QrCode, Check, X, Send, Mail, Eye, Camera, Weight,
} from 'lucide-react'
import { brand, fontBody, fontDisplay, fontMono } from '@/lib/brand'
import { ROLE_PROFILES } from '@/lib/constants'
import { useApp } from '@/lib/context'
import { WebShell } from '@/components/shell/WebShell'
import { Topbar } from '@/components/ui/Topbar'
import { Btn } from '@/components/ui/Btn'
import { Stat } from '@/components/ui/Stat'
import { Panel } from '@/components/ui/Panel'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

export function AlmacenApp() {
  const [view, setView] = useState('panel')
  const { rolls, orders, recepciones, egresos, addEgreso, updateOrder } = useApp()

  const menuItems = [
    { full: true, hint: true, id: 'panel', emoji: '📊', icon: BarChart3, label: 'Panel' },
    { section: 'Ingreso (MT-PC-001)' },
    { id: 'recepcion', emoji: '📥', icon: PackagePlus, label: 'Recepción' },
    { id: 'muestreo', emoji: '🔬', icon: ClipboardCheck, label: 'Muestreo calidad' },
    { section: 'Egreso (MT-PC-002)' },
    { id: 'egreso', emoji: '📤', icon: PackageMinus, label: 'Egreso a producción' },
    { id: 'retorno', emoji: '↩️', icon: RefreshCw, label: 'Retorno a almacén' },
    { section: 'Inventario' },
    { id: 'rollos', emoji: '📦', icon: Package, label: 'Rollos' },
    { id: 'ubicaciones', emoji: '📍', icon: MapPin, label: 'Ubicaciones' },
  ]
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <WebShell perfil="Almacén" profileData={ROLE_PROFILES.almacen} currentView={view} onChangeView={setView} menuItems={menuItems}>
      {view === 'panel' && (
        <>
          <Topbar crumbs="Almacén / Panel" title="Logística de almacén"
            actions={<Btn variant="primary" icon={RefreshCw}>Sincronizar SAE</Btn>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Rollos en almacén" value={rolls.filter((r) => r.estado === 'almacen').length} variant="red" />
              <Stat label="Empezados (priorizar)" value={rolls.filter((r) => r.empezado && r.estado === 'almacen').length} variant="warn" delta={{ text: 'usar primero · MT-PC-002 política' }} />
              <Stat label="Recepciones hoy" value={recepciones.filter((r) => r.fecha === hoy).length} />
              <Stat label="Egresos hoy" value={egresos.filter((e) => e.fecha === hoy).length} variant="ok" />
            </div>
            <Panel title="Pedidos pendientes de egreso" code="MT-PC-002 act. 7-9">
              <Table cols={['Pedido', 'Cliente', 'Material', 'Estado pago', 'Estado material', '']}
                rows={orders.filter((o) => o.pagoConfirmado && !o.materialEgresado).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente,
                  `${o.material} ${o.medida}`,
                  <Badge key="pa" variant="ok">Confirmado</Badge>,
                  <Badge key="m" variant="warn">Por surtir</Badge>,
                  <Btn key="b" variant="primary" icon={Send} onClick={() => {
                    addEgreso({ pedido: o.id, material: o.material, rollos: Math.ceil(o.meta / 20), m2: o.m2, empezadosUsados: 1, responsableAlmacen: 'Alberto O.', responsableProd: 'Carlos A.', confirmado: true })
                    updateOrder(o.id, { materialEgresado: true, estado: 'material-egresado' })
                    alert(`Material egresado al área de producción.\nMT-DT-002 generado.`)
                  }}>Surtir material</Btn>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'recepcion' && (
        <>
          <Topbar crumbs="Almacén / Recepción" title="Recepción de material" processCode="MT-PC-001"
            actions={<Btn variant="primary" icon={Plus}>Nueva recepción</Btn>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 18, borderRadius: 4, marginBottom: 20, borderLeft: `3px solid ${brand.red}` }}>
              <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.2em', color: brand.red, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Política de recepción</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#444' }}>
                <b>1.</b> Verificar Packing List vs documentación · <b>2.</b> Etiquetar rollos con QR · <b>3.</b> Muestreo 1 de cada 5 rollos · <b>4.</b> Pruebas visual, táctil y peso · <b>5.</b> Si pasa: registrar en SAE (max 1 día hábil)
              </div>
            </div>
            <Panel title="Recepciones recientes" code="MT-DT-001">
              <Table cols={['ID', 'Fecha', 'Proveedor', 'Packing List', 'Factura', 'Rollos', 'Peso total', 'Muestreo', 'En SAE', 'Resp.']}
                rows={recepciones.map((r) => [
                  <b key="i" style={{ color: brand.red }}>{r.id}</b>,
                  r.fecha, r.proveedor, r.packingList, r.factura, r.rollos, `${r.pesoTotal} kg`,
                  r.muestreoOK ? <Badge key="m" variant="ok">Pasa</Badge> : <Badge key="m" variant="bad">Rechazado</Badge>,
                  r.ingresadoSAE ? <Check key="s" size={16} color={brand.ok} /> : <X key="s" size={16} color={brand.red} />,
                  r.responsable,
                ])} />
            </Panel>
            {recepciones.filter((r) => !r.muestreoOK).length > 0 && (
              <Panel title="Incidencias con proveedor — pendientes" code="MT-PC-001 act. 21-23">
                <div style={{ padding: 14 }}>
                  {recepciones.filter((r) => !r.muestreoOK).map((r) => (
                    <div key={r.id} style={{ padding: 14, marginBottom: 8, background: '#fff3cd', border: `1px solid ${brand.warn}`, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <b style={{ ...fontDisplay, fontSize: 14, textTransform: 'uppercase' }}>{r.proveedor} · {r.id}</b>
                          <div style={{ ...fontBody, fontSize: 12, color: '#856404', marginTop: 4 }}>{r.incidencia}</div>
                        </div>
                        <Btn variant="primary" icon={Mail}>Notificar proveedor</Btn>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </>
      )}

      {view === 'muestreo' && (
        <>
          <Topbar crumbs="Almacén / Muestreo" title="Muestreo de calidad" processCode="MT-PC-001 act. 13-19" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff3cd', border: `1px solid ${brand.warn}`, padding: 14, borderRadius: 4, marginBottom: 20, ...fontBody, fontSize: 13, color: '#856404' }}>
              <b>Procedimiento:</b> Seleccionar 1 de cada 5 rollos aleatoriamente. Pruebas: visual, táctil, peso (vs declarado). Diferencia → segundo muestreo. Si persiste → limitar acceso.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {[
                { icon: Eye, label: 'Prueba visual', desc: 'Integridad superficial' },
                { icon: Camera, label: 'Prueba táctil', desc: 'Textura y acabado' },
                { icon: Weight, label: 'Prueba de peso', desc: 'vs Packing List' },
              ].map((p, i) => (
                <div key={i} style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 18, borderRadius: 4, borderTop: `3px solid ${brand.red}`, textAlign: 'center' }}>
                  <p.icon size={28} style={{ margin: '0 auto 8px', color: brand.red }} />
                  <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase' }}>{p.label}</div>
                  <div style={{ ...fontBody, fontSize: 12, color: '#666', marginTop: 4 }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'egreso' && (
        <>
          <Topbar crumbs="Almacén / Egreso" title="Egreso de material a producción" processCode="MT-PC-002" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 18, borderRadius: 4, marginBottom: 20, borderLeft: `3px solid ${brand.red}` }}>
              <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.2em', color: brand.red, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Política — MT-PC-002 § 3</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#444' }}>
                <b>Prioridad:</b> primero rollos empezados, después rollos nuevos. Verificar SAE vs físico antes de surtir. No surtir si el pedido no está liberado por Cobranza.
              </div>
            </div>
            <Panel title="Egresos recientes" code="MT-DT-002">
              <Table cols={['ID', 'Fecha', 'Pedido', 'Material', 'Rollos', 'M²', 'Empezados', 'Resp. Almacén', 'Resp. Producción', 'Estado']}
                rows={egresos.map((e) => [
                  <b key="i" style={{ color: brand.red }}>{e.id}</b>,
                  e.fecha, e.pedido, e.material, e.rollos, `${e.m2.toLocaleString()} m²`,
                  e.empezadosUsados > 0 ? <Badge key="x" variant="ok">{e.empezadosUsados}</Badge> : '—',
                  e.responsableAlmacen, e.responsableProd,
                  e.confirmado ? <Badge key="c" variant="ok">Confirmado</Badge> : <Badge key="c" variant="warn">Pendiente</Badge>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'retorno' && (
        <>
          <Topbar crumbs="Almacén / Retorno" title="Retorno de material a almacén" processCode="MT-DT-005" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#e8f5e9', border: `1px solid ${brand.ok}`, padding: 14, borderRadius: 4, marginBottom: 20, ...fontBody, fontSize: 13, color: '#1b5e20' }}>
              <b>Material útil sobrante</b> que regresa al almacén después de producción. Emplayar y etiquetar antes de devolver al inventario.
            </div>
            <Panel title="Sobrantes pendientes de retorno">
              <Table cols={['Fecha', 'Pedido', 'Material', 'Cantidad', 'Empezado', 'Responsable']}
                rows={[
                  ['2026-05-24', 'VFGC 886', 'CUBRESUELO NEGRO 105GR', '12.5 m', <Badge key="1" variant="warn">Sí</Badge>, 'Karen'],
                  ['2026-05-23', 'VFGC 891', 'MALLA RASCHEL 35% BLANCA', '4.5 m', <Badge key="2" variant="warn">Sí</Badge>, 'Erik'],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'rollos' && (
        <>
          <Topbar crumbs="Inventario / Rollos" title={`${rolls.length} rollos · ${rolls.reduce((a, r) => a + r.peso, 0).toFixed(1)} kg`}
            actions={<><Btn variant="ghost" icon={Printer}>Imprimir QR</Btn><Btn variant="primary" icon={Plus}>Entrada</Btn></>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="En almacén" value={rolls.filter((r) => r.estado === 'almacen').length} />
              <Stat label="Empezados" value={rolls.filter((r) => r.empezado).length} variant="warn" />
              <Stat label="En producción" value={rolls.filter((r) => r.estado === 'en-linea').length} variant="red" />
              <Stat label="Faltantes" value={rolls.filter((r) => r.estado === 'faltante').length} variant="bad" />
            </div>
            <Panel title="Todos los rollos">
              <Table cols={['QR', 'Material', 'Medida', 'Lote', 'Peso', 'Ubicación', 'Empezado', 'Pedido', 'Estado']}
                rows={rolls.map((r) => [
                  <span key="q" style={{ ...fontMono, fontSize: 10, color: '#666' }}><QrCode size={12} style={{ display: 'inline', marginRight: 4 }} />{r.id}</span>,
                  <b key="m">{r.material}</b>,
                  r.medida, r.lote, `${r.peso} kg`,
                  <span key="u" style={{ ...fontMono, fontSize: 12 }}>{r.ubicacion}</span>,
                  r.empezado ? <Badge key="e" variant="warn">Sí</Badge> : <span style={{ color: '#999' }}>—</span>,
                  r.pedido ? <span key="p" style={{ color: brand.red, fontWeight: 600 }}>{r.pedido}</span> : <span style={{ color: '#999' }}>—</span>,
                  <Badge key="s" variant={r.estado === 'en-linea' ? 'ok' : r.estado === 'reservado' ? 'warn' : r.estado === 'faltante' ? 'bad' : 'default'}>{r.estado.replace('-', ' ')}</Badge>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'ubicaciones' && (
        <>
          <Topbar crumbs="Inventario / Ubicaciones" title="Mapa de ubicaciones (LAYOUT)" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Distribución por zona">
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {['A', 'B', 'C', 'D'].map((zona) => (
                  <div key={zona} style={{ background: brand.paper, border: `1px solid ${brand.line}`, borderRadius: 4, padding: 14 }}>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, color: brand.red, textAlign: 'center', marginBottom: 8 }}>Zona {zona}</div>
                    <div style={{ ...fontMono, fontSize: 11, color: '#666', textAlign: 'center' }}>
                      {rolls.filter((r) => r.ubicacion.startsWith(zona)).length} rollos
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </WebShell>
  )
}
