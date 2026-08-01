'use client'

// MT-PC-003 — Jefe de Producción · Carlos A.
import { useState } from 'react'
import {
  BarChart3, FileText, Clock, Calendar, Layers, Users, Bell, Weight, AlertTriangle,
  RefreshCw, Plus, Eye, Check, X,
} from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { LINEAS_REALES, ROLES, PROCESOS_PRODUCCION, CATEGORIAS_MATERIAL, ROLE_PROFILES, EMOJI_LINEA } from '@/lib/constants'
import { useApp } from '@/lib/context'
import { WebShell } from '@/components/shell/WebShell'
import { Topbar } from '@/components/ui/Topbar'
import { Btn } from '@/components/ui/Btn'
import { Stat } from '@/components/ui/Stat'
import { Panel } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { OrderStatusPill } from '@/components/ui/OrderStatusPill'
import { ProcessTag } from '@/components/ui/ProcessTag'

export function ProduccionApp({ iaOpenTab }) {
  const [view, setView] = useState('tablero')
  const { orders, avisos, operators, mermas, productosTerminados, productividad, updateOrder } = useApp()

  const lines = LINEAS_REALES.map((l) => l.id)
  const enProd = orders.filter((o) => o.estado === 'en-produccion').length
  const urgentes = avisos.filter((a) => a.estado === 'urgente').length

  const menuItems = [
    { full: true, hint: true, id: 'tablero', emoji: '📊', icon: BarChart3, label: 'Tablero' },
    { id: 'bitacora', emoji: '📋', icon: FileText, label: 'Bitácora pedidos' },
    { id: 'productividad', emoji: '⏱️', icon: Clock, label: 'Productividad' },
    { id: 'planificacion', emoji: '📅', icon: Calendar, label: 'Planificación' },
    { id: 'lineas', emoji: '🏭', icon: Layers, label: 'Líneas' },
    { id: 'asignaciones', emoji: '👷', icon: Users, label: 'Asignar operadores' },
    { id: 'avisos', emoji: '🔔', icon: Bell, label: 'Avisos', badge: urgentes > 0 ? urgentes : null },
    { section: 'Verificación' },
    { id: 'pesaje', emoji: '⚖️', icon: Weight, label: 'Pesaje final' },
    { id: 'mermas', emoji: '⚠️', icon: AlertTriangle, label: 'Mermas y defectos' },
    { section: 'Documentos' },
    { id: 'docs', emoji: '📄', icon: FileText, label: 'MT-DT-003/004/006' },
  ]

  return (
    <WebShell perfil="Producción" profileData={ROLE_PROFILES.produccion} currentView={view} onChangeView={setView} menuItems={menuItems} iaOpenTab={iaOpenTab}>
      {view === 'tablero' && (
        <>
          <Topbar crumbs="Producción / Tablero" title="Jefe de Producción" processCode="MT-PC-003"
            actions={<><Btn variant="ghost" icon={RefreshCw}>Actualizar</Btn><Btn variant="primary" icon={Plus}>Programar pedido</Btn></>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="En producción" value={`${enProd}/${lines.length}`} variant="red" />
              <Stat label="Operadores activos" value={operators.filter((o) => o.role === ROLES.OPERADOR).length} delta={{ text: 'Tipo A/B/C/D' }} />
              <Stat label="Avisos urgentes" value={urgentes} variant={urgentes > 0 ? 'bad' : 'ok'} />
              <Stat label="Defectos hoy" value={mermas.filter((m) => m.categoria === 'defecto').length} variant="warn" />
            </div>
            <Panel title="Líneas de producción · estado actual" filters={<Chip on>Todas</Chip>}>
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {lines.map((line) => {
                  const lo = orders.filter((o) => o.linea === line && o.estado === 'en-produccion')
                  const o = lo[0]
                  const alert = avisos.find((a) => a.linea === line && a.estado === 'urgente')
                  return (
                    <div key={line} style={{ background: brand.paper, border: `1px solid ${brand.line}`, borderRadius: 4, padding: 12, borderTop: `3px solid ${alert ? brand.red : o ? brand.ok : '#ccc'}` }}>
                      <h5 style={{ ...fontDisplay, fontWeight: 800, fontSize: 13, paddingBottom: 8, marginBottom: 8, textTransform: 'uppercase', borderBottom: `1px solid ${brand.line}` }}>{line}</h5>
                      {o ? (
                        <>
                          <div style={{ ...fontMono, fontSize: 9, color: brand.red, letterSpacing: '0.12em', marginBottom: 4, fontWeight: 600 }}>{o.id}</div>
                          <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 12, marginBottom: 6, textTransform: 'uppercase', lineHeight: 1.2 }}>{o.material}</div>
                          <div style={{ ...fontMono, fontSize: 9, color: '#888', marginBottom: 8 }}>{PROCESOS_PRODUCCION.find((p) => p.id === o.procesoActual)?.label}</div>
                          <div style={{ height: 4, background: brand.line, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(o.hechas / o.meta) * 100}%`, background: brand.red }} />
                          </div>
                          <div style={{ ...fontMono, fontSize: 10, marginTop: 4, color: brand.black, fontWeight: 600 }}>{Math.round((o.hechas / o.meta) * 100)}% · {o.hechas}/{o.meta}</div>
                          {alert && <div style={{ marginTop: 6, padding: '4px 6px', background: brand.red, color: 'white', ...fontDisplay, fontWeight: 700, fontSize: 9, textAlign: 'center', textTransform: 'uppercase', borderRadius: 2 }}>⚠ {alert.tipo}</div>}
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0', ...fontBody, fontSize: 11, color: '#aaa' }}>Libre</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
            <Panel title="Pedidos liberados pendientes de programar" code="MT-PC-003 act. 1-5">
              <Table cols={['Pedido', 'Cliente', 'Producto', 'Procesos', 'Material', 'Compromiso', '']}
                rows={orders.filter((o) => o.estado === 'liberado' || o.estado === 'material-egresado').map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente,
                  `${o.material} ${o.medida}`,
                  <div key="pr" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {o.procesos.map((p) => <Badge key={p} variant="dark">{PROCESOS_PRODUCCION.find((pp) => pp.id === p)?.label}</Badge>)}
                  </div>,
                  o.materialEgresado ? <Badge key="m" variant="ok">Egresado</Badge> : <Badge key="m" variant="warn">Por surtir</Badge>,
                  o.compromiso,
                  <Btn key="b" variant={o.materialEgresado ? 'primary' : 'ghost'} disabled={!o.materialEgresado}
                    onClick={() => updateOrder(o.id, { estado: 'en-produccion', procesoActual: o.procesos[0] })}>
                    {o.materialEgresado ? 'Iniciar' : 'Espera egreso'}
                  </Btn>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'bitacora' && (
        <>
          <Topbar crumbs="Producción / Bitácora" title="Bitácora de pedidos" processCode="MT-PC-003"
            actions={<><Btn variant="ghost" emoji="📥">Importar Excel</Btn><Btn variant="ghost" emoji="📤">Exportar</Btn><Btn variant="primary" emoji="➕">Nuevo pedido</Btn></>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#e8f5e9', border: `1px solid ${brand.ok}`, padding: 14, borderRadius: 8, marginBottom: 20, ...fontBody, fontSize: 13, color: '#1b5e20' }}>
              <b>📋 Reemplaza la planeación de pedidos en Excel.</b> Misma información (fecha pedido, cliente, material, rollos, m², status, entregados, en piso, forma de entrega, observaciones) pero centralizada y conectada con el resto del sistema.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Total mes" value={orders.length} emoji="📊" />
              <Stat label="En producción" value={orders.filter((o) => o.estado === 'en-produccion').length} variant="red" emoji="🏭" />
              <Stat label="Terminados" value={orders.filter((o) => o.estado === 'terminado').length} variant="ok" emoji="✅" />
              <Stat label="Entregados" value={orders.filter((o) => o.estado === 'entregado').length} emoji="📦" />
              <Stat label="Detenidos" value={orders.filter((o) => o.estado === 'detenido').length} variant="warn" emoji="⏸️" />
            </div>
            <Panel title="Bitácora completa" emoji="📋"
              filters={<><Chip on>Todos</Chip><Chip>En piso</Chip><Chip>Detenidos</Chip><Chip>Entregados</Chip></>}>
              <Table cols={['Pedido', 'Fecha pedido', 'Cliente', 'Material', 'Rollos', 'Medida', 'M²', 'Status', 'Compromiso', 'Entrega', 'Terminados', 'Entregados', 'Pendientes', 'En piso', 'Línea/Op']}
                rows={orders.map((o) => {
                  const ops = operators.filter((op) => o.operador.includes(op.id))
                  return [
                    <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                    <span key="f" style={{ ...fontMono, fontSize: 11 }}>{o.fechaPedido}</span>,
                    <span key="c" style={{ fontSize: 12 }}>{o.cliente}</span>,
                    <span key="m" style={{ fontSize: 12, fontWeight: 600 }}>{o.material}</span>,
                    o.rollos,
                    <span key="me" style={{ ...fontMono, fontSize: 11 }}>{o.medida}</span>,
                    <span key="m2" style={{ ...fontMono, fontSize: 11 }}>{o.m2.toLocaleString()}</span>,
                    <OrderStatusPill key="s" estado={o.estado} />,
                    <span key="co" style={{ ...fontMono, fontSize: 11 }}>{o.compromiso}</span>,
                    <Badge key="e" variant="default">{o.formaEntrega}</Badge>,
                    <b key="t" style={{ color: brand.ok }}>{o.terminados ?? '—'}</b>,
                    <b key="en" style={{ color: brand.black }}>{o.entregados ?? '—'}</b>,
                    <b key="pe" style={{ color: brand.warn }}>{o.pendientes ?? '—'}</b>,
                    <b key="ep" style={{ color: brand.red }}>{o.enPiso ?? '—'}</b>,
                    o.linea ? <span key="l" style={{ ...fontMono, fontSize: 11 }}>{EMOJI_LINEA[o.linea] || ''} {o.linea} · {ops.map((op) => op.name).join(',')}</span> : <span style={{ color: '#999' }}>—</span>,
                  ]
                })} />
            </Panel>
          </div>
        </>
      )}

      {view === 'productividad' && (
        <>
          <Topbar crumbs="Producción / Productividad" title="Sistema de productividad por turno" processCode="MT-PC-003"
            actions={<><Btn variant="ghost" emoji="📤">Exportar</Btn><Btn variant="primary" emoji="➕">Registrar turno</Btn></>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#e3f2fd', border: `1px solid #1565c0`, padding: 14, borderRadius: 8, marginBottom: 20, ...fontBody, fontSize: 13, color: '#0d47a1' }}>
              <b>⏱️ Reemplaza el archivo de productividad en Excel.</b> Registra hora real de inicio/final, imprevistos (min), tiempo efectivo, metros lineales y piezas por turno.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Turnos registrados" value={productividad.length} variant="red" emoji="📝" />
              <Stat label="Operador top" value={operators.filter((o) => o.role === ROLES.OPERADOR).sort((a, b) => (b.promedioMLhr || 0) - (a.promedioMLhr || 0))[0]?.name} delta={{ text: 'mL/hr más alto' }} emoji="🏆" />
              <Stat label="Promedio planta" value={`${Math.round(operators.filter((o) => o.promedioMLhr).reduce((a, o) => a + o.promedioMLhr, 0) / operators.filter((o) => o.promedioMLhr).length)} mL/hr`} variant="ok" emoji="📈" />
              <Stat label="Imprevistos hoy" value={`${productividad.filter((p) => p.fecha === '2026-05-21').reduce((a, p) => a + p.imprevistos, 0)} min`} variant="warn" emoji="⚠️" />
            </div>
            <Panel title="Registro diario por turno" emoji="📋" code="MT-DT-003"
              filters={<><Chip on>Todos</Chip><Chip>Hoy</Chip><Chip>Esta semana</Chip></>}>
              <Table cols={['Fecha', 'Línea', 'Operador', 'Inicio', 'Final', 'Imprev.', 'T. efectivo', 'mL turno', 'Piezas', 'mL/hr', 'Pz/hr']}
                rows={productividad.map((p) => {
                  const mlhr = p.tiempoEfectivo > 0 ? Math.round((p.mLTurno / p.tiempoEfectivo) * 60) : 0
                  const pzhr = p.tiempoEfectivo > 0 ? ((p.piezasTurno / p.tiempoEfectivo) * 60).toFixed(2) : '0'
                  return [
                    <span key="f" style={{ ...fontMono, fontSize: 11 }}>{p.fecha}</span>,
                    <span key="l" style={{ ...fontMono, fontSize: 11, fontWeight: 600 }}>{EMOJI_LINEA[p.linea]} {p.linea}</span>,
                    <b key="o">{p.operador}</b>,
                    <span key="i" style={{ ...fontMono, fontSize: 11 }}>{p.horaInicio}</span>,
                    <span key="fn" style={{ ...fontMono, fontSize: 11 }}>{p.horaFinal}</span>,
                    p.imprevistos > 0 ? <Badge key="im" variant="warn">{p.imprevistos} min</Badge> : '—',
                    <span key="te" style={{ ...fontMono, fontSize: 11 }}>{p.tiempoEfectivo} min</span>,
                    <b key="ml">{p.mLTurno}</b>,
                    <b key="pz">{p.piezasTurno}</b>,
                    <span key="mlh" style={{ ...fontMono, fontWeight: 700, color: brand.red }}>{mlhr}</span>,
                    <span key="pzh" style={{ ...fontMono, fontWeight: 700, color: brand.red }}>{pzhr}</span>,
                  ]
                })} />
            </Panel>
          </div>
        </>
      )}

      {view === 'planificacion' && (
        <>
          <Topbar crumbs="Producción / Planificación" title="Planificación de pedidos" processCode="MT-PC-003 act. 1-5" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Calendario de producción esta semana">
              <div style={{ padding: 14 }}>
                {orders.filter((o) => ['en-produccion', 'liberado', 'material-egresado'].includes(o.estado)).map((o) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 8px', borderBottom: `1px solid ${brand.line}` }}>
                    <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 14, color: brand.red, minWidth: 80 }}>{o.id}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{o.material} {o.medida}</div>
                      <div style={{ ...fontBody, fontSize: 11, color: '#666' }}>{o.cliente} · Procesos: {o.procesos.map((p) => PROCESOS_PRODUCCION.find((pp) => pp.id === p)?.label).join(' → ')}</div>
                    </div>
                    <div style={{ ...fontMono, fontSize: 11, color: '#888' }}>{o.compromiso}</div>
                    <OrderStatusPill estado={o.estado} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}

      {view === 'lineas' && (
        <>
          <Topbar crumbs="Producción / Líneas" title="Estado de líneas" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {lines.map((line) => {
              const lo = orders.filter((o) => o.linea === line)
              return (
                <Panel key={line} title={line}>
                  {lo.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#999', ...fontBody }}>Sin órdenes asignadas</div>
                  ) : (
                    <Table cols={['Pedido', 'Material', 'Procesos', 'Operador', 'Avance', 'Estado']}
                      rows={lo.map((o) => {
                        const ops = operators.filter((op) => o.operador.includes(op.id))
                        const p = Math.round((o.hechas / o.meta) * 100)
                        return [
                          <b key="1" style={{ color: brand.red }}>{o.id}</b>,
                          `${o.material} ${o.medida}`,
                          <div key="pr" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {o.procesos.map((pid) => <Badge key={pid} variant={pid === o.procesoActual ? 'red' : 'default'}>{PROCESOS_PRODUCCION.find((pp) => pp.id === pid)?.label}</Badge>)}
                          </div>,
                          ops.map((op) => `${op.name} (${op.tipo})`).join(', ') || '—',
                          <div key="a" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
                            <div style={{ flex: 1, height: 6, background: '#eee', borderRadius: 3 }}>
                              <div style={{ width: `${p}%`, height: '100%', background: brand.red, borderRadius: 3 }} />
                            </div>
                            <b style={{ ...fontMono, fontSize: 11 }}>{p}%</b>
                          </div>,
                          <OrderStatusPill key="b" estado={o.estado} />,
                        ]
                      })} />
                  )}
                </Panel>
              )
            })}
          </div>
        </>
      )}

      {view === 'asignaciones' && (
        <>
          <Topbar crumbs="Producción / Operadores" title="Operadores y competencias" processCode="MT-PC-003 política 2" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {['A', 'B', 'C', 'D'].map((t) => (
                <Stat key={t} label={`Tipo ${t}`} value={operators.filter((o) => o.role === ROLES.OPERADOR && o.tipo === t).length} />
              ))}
            </div>
            <Panel title="Personal técnico de producción" code="MT-PC-003 política 2">
              <Table cols={['Operador', 'Tipo', 'Competencias', 'Línea actual', 'Asignado a']}
                rows={operators.filter((o) => o.role === ROLES.OPERADOR).map((op) => [
                  <div key="op" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: op.color, color: 'white', display: 'grid', placeItems: 'center', ...fontDisplay, fontWeight: 900, fontSize: 13 }}>{op.initial}</div>
                    <b>{op.name}</b>
                  </div>,
                  <Badge key="t" variant="red">Tipo {op.tipo}</Badge>,
                  <div key="m" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {op.maquinas.map((m) => <Badge key={m} variant="dark">{PROCESOS_PRODUCCION.find((p) => p.id === m)?.label}</Badge>)}
                  </div>,
                  op.linea,
                  orders.filter((o) => o.operador.includes(op.id) && o.estado === 'en-produccion').map((o) => o.id).join(', ') || <span style={{ color: '#999' }}>—</span>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'avisos' && (
        <>
          <Topbar crumbs="Producción / Avisos" title="Avisos del piso" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title={`${avisos.length} avisos recibidos hoy`}>
              <Table cols={['Hora', 'Línea', 'Operador', 'Tipo', 'Descripción', 'Tiempo', 'Estado', '']}
                rows={avisos.map((a) => [
                  a.hora, <b key="l">{a.linea}</b>, a.operador, a.tipo, a.desc, <b key="t">{a.tiempo}</b>,
                  <Badge key="b" variant={a.estado === 'urgente' ? 'bad' : a.estado === 'resuelto' ? 'ok' : 'warn'}>{a.estado}</Badge>,
                  <Btn key="x" variant={a.estado === 'urgente' ? 'primary' : 'ghost'}>{a.estado === 'urgente' ? 'Atender' : 'Ver'}</Btn>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'pesaje' && (
        <>
          <Topbar crumbs="Producción / Pesaje" title="Verificación de pesos producto terminado" processCode="MT-PC-003 act. 39-40" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff3cd', border: `1px solid ${brand.warn}`, padding: 14, borderRadius: 4, marginBottom: 20, ...fontBody, fontSize: 13, color: '#856404' }}>
              <b>Política:</b> el jefe de producción debe verificar que el peso real corresponde al peso teórico calculado según material y dimensiones. Si hay diferencia, detener el producto y aplicar acciones correctivas.
            </div>
            <Panel title="Productos terminados — registros recientes" code="MT-DT-006">
              <Table cols={['ID', 'Pedido', 'Material', 'Medida', 'Rollos', 'Peso teórico', 'Peso real', 'Δ', 'Verificado', 'Resp.']}
                rows={productosTerminados.map((pt) => {
                  const diff = ((pt.pesoReal - pt.pesoTeorico) / pt.pesoTeorico * 100).toFixed(1)
                  const ok = Math.abs(parseFloat(diff)) < 5
                  return [
                    <b key="i" style={{ color: brand.red }}>{pt.id}</b>,
                    pt.pedido, pt.material, pt.medida, pt.rollos,
                    `${pt.pesoTeorico} kg`, `${pt.pesoReal} kg`,
                    <Badge key="d" variant={ok ? 'ok' : 'bad'}>{parseFloat(diff) > 0 ? '+' : ''}{diff}%</Badge>,
                    pt.verificado ? <Check key="v" size={16} color={brand.ok} /> : <X key="v" size={16} color={brand.red} />,
                    pt.responsable,
                  ]
                })} />
            </Panel>
          </div>
        </>
      )}

      {view === 'mermas' && (
        <>
          <Topbar crumbs="Producción / Mermas" title="Mermas, defectos y desperdicios" processCode="MT-PC-003 política 8" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {Object.values(CATEGORIAS_MATERIAL).map((c) => (
                <div key={c.id} style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 14, borderRadius: 4, borderTop: `3px solid ${c.color}` }}>
                  <div style={{ ...fontMono, fontSize: 9, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</div>
                  <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 26 }}>{mermas.filter((m) => m.categoria === c.id).reduce((a, m) => a + m.metros, 0).toFixed(1)} m</div>
                  <div style={{ ...fontBody, fontSize: 11, color: '#666', marginTop: 4 }}>{c.desc}</div>
                </div>
              ))}
            </div>
            <Panel title="Registros de mermas" code="MT-DT-003">
              <Table cols={['Fecha', 'Pedido', 'Operador', 'Línea', 'Material', 'Metros', 'Categoría', 'Defecto']}
                rows={mermas.map((m) => [
                  m.fecha, m.pedido || '—', m.operador, m.linea, m.material,
                  <b key="m">{m.metros} m</b>,
                  <Badge key="c" variant={m.categoria === 'desperdicio' ? 'bad' : m.categoria === 'defecto' ? 'warn' : 'ok'}>{m.categoria}</Badge>,
                  m.defecto,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'docs' && (
        <>
          <Topbar crumbs="Producción / Documentos" title="Documentos del proceso de producción" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { code: 'MT-DT-003', name: 'Control de material en producción', desc: 'Movimientos de material por etapa' },
                { code: 'MT-DT-004', name: 'Control de conteo de rollos', desc: 'Rollos usados, sobrante, defecto' },
                { code: 'MT-DT-005', name: 'Retorno de material a almacén', desc: 'Sobrantes que regresan al inventario' },
                { code: 'MT-DT-006', name: 'Check list de producto terminado', desc: 'Pesaje y verificación final' },
              ].map((d) => (
                <div key={d.code} style={{ background: 'white', border: `1px solid ${brand.line}`, borderTop: `3px solid ${brand.red}`, borderRadius: 4, padding: 18 }}>
                  <ProcessTag code={d.code} />
                  <h4 style={{ ...fontDisplay, fontWeight: 800, fontSize: 18, marginTop: 10, marginBottom: 6, textTransform: 'uppercase' }}>{d.name}</h4>
                  <p style={{ ...fontBody, fontSize: 13, color: '#666' }}>{d.desc}</p>
                  <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                    <Btn variant="ghost" icon={Eye}>Ver registros</Btn>
                    <Btn variant="primary" icon={Plus}>Nuevo</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </WebShell>
  )
}
