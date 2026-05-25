'use client'

// Dirección · Víctor F. G. — KPIs ejecutivos, OEE
import { useState } from 'react'
import {
  BarChart3, PackagePlus, PackageMinus, Factory, TrendingUp, DollarSign, FileText,
  Download, Check, X,
} from 'lucide-react'
import { brand, fontBody, fontDisplay, fontMono } from '@/lib/brand'
import { ROLES, ROLE_PROFILES, EMOJI_LINEA } from '@/lib/constants'
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

export function DirectorApp() {
  const [view, setView] = useState('ejecutivo')
  const [period, setPeriod] = useState('semana')
  const { orders, productosTerminados, egresos, productividad, operators } = useApp()

  const menuItems = [
    { full: true, hint: true, id: 'ejecutivo', emoji: '📊', icon: BarChart3, label: 'Ejecutivo' },
    { section: 'Indicadores' },
    { id: 'kpi-ingreso', emoji: '📥', icon: PackagePlus, label: 'KPI Ingreso' },
    { id: 'kpi-egreso', emoji: '📤', icon: PackageMinus, label: 'KPI Egreso' },
    { id: 'kpi-produccion', emoji: '🏭', icon: Factory, label: 'KPI Producción' },
    { section: 'Análisis' },
    { id: 'productividad', emoji: '📈', icon: TrendingUp, label: 'Productividad' },
    { id: 'costos', emoji: '💰', icon: DollarSign, label: 'Costos' },
    { id: 'pedidos', emoji: '📋', icon: FileText, label: 'Pedidos SAE' },
  ]

  return (
    <WebShell perfil="Dirección" profileData={ROLE_PROFILES.director} currentView={view} onChangeView={setView} menuItems={menuItems}>
      {view === 'ejecutivo' && (
        <>
          <Topbar crumbs="Dirección / Tablero ejecutivo" title="Semana 21 · Mayo 2026"
            actions={
              <>
                {['hoy', 'semana', 'mes', 'año'].map((p) => (
                  <Chip key={p} on={period === p} onClick={() => setPeriod(p)}>{p}</Chip>
                ))}
                <Btn variant="ghost" icon={Download}>PDF</Btn>
              </>
            } />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="M² producidos" value="14,328" variant="red" delta={{ up: true, text: '8.2% vs sem. ant.' }} />
              <Stat label="OEE promedio" value="76%" delta={{ up: true, text: 'meta 80%' }} />
              <Stat label="Pedidos a tiempo" value="94%" delta={{ up: true, text: '17 de 18' }} />
              <Stat label="Costo merma" value="$28,470" variant="warn" delta={{ down: true, text: '2.3% del total' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
              <Panel title="Producción por línea · semana">
                <div style={{ padding: '32px 24px 48px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 208, padding: '0 14px', borderBottom: `1px solid ${brand.line}` }}>
                    {[
                      { n: 'Cos 1', v: 342, h: 78, c: brand.red },
                      { n: 'Perf',  v: 271, h: 62, c: brand.black },
                      { n: 'Cos 2', v: 398, h: 91, c: brand.red },
                      { n: 'Corte', v: 241, h: 55, c: brand.red },
                      { n: 'Cos 3', v: 131, h: 30, c: brand.warn },
                    ].map((b, i) => (
                      <div key={i} style={{ flex: 1, position: 'relative', height: `${b.h}%`, background: b.c, minWidth: 30, borderRadius: '2px 2px 0 0' }}>
                        <span style={{ position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)', ...fontMono, fontSize: 10, color: '#888' }}>{b.n}</span>
                        <span style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', ...fontDisplay, fontWeight: 700, fontSize: 12 }}>{b.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
              <Panel title="OEE Global">
                <div style={{ display: 'grid', placeItems: 'center', padding: '24px 0' }}>
                  <div style={{ width: 160, height: 160, borderRadius: '50%', background: `conic-gradient(${brand.ok} 0 62%, ${brand.warn} 62% 82%, ${brand.red} 82% 100%)`, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 24, background: 'white', borderRadius: '50%' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1, textAlign: 'center' }}>
                      <div>
                        <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 32 }}>76%</div>
                        <div style={{ ...fontMono, fontSize: 9, color: '#666', letterSpacing: '0.2em', textTransform: 'uppercase' }}>OEE</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 24px 24px', ...fontBody, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: brand.ok, borderRadius: 2 }} /><b>Disponibilidad</b> 88%</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: brand.warn, borderRadius: 2 }} /><b>Rendimiento</b> 91%</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, background: brand.red, borderRadius: 2 }} /><b>Calidad</b> 95%</div>
                </div>
              </Panel>
            </div>
            <Panel title="Pedidos SAE — esta semana" filters={<><Chip on>Todos</Chip><Chip>En piso</Chip><Chip>Retrasados</Chip></>}>
              <Table cols={['Pedido', 'Cliente', 'Producto', 'M²', 'Compromiso', 'Estado']}
                rows={orders.map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente, `${o.material} ${o.medida}`,
                  `${o.m2.toLocaleString()} m²`, o.compromiso, <OrderStatusPill key="s" estado={o.estado} />,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'kpi-ingreso' && (
        <>
          <Topbar crumbs="Indicadores / Ingreso" title="Indicadores del proceso de ingreso" processCode="MT-PC-001 § 6" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Indicadores formales según MT-PC-001-2026">
              <Table cols={['#', 'Indicador', 'Métrica', 'Resultado', 'Cumplimiento', 'Periodicidad']}
                rows={[
                  ['1', 'Verificación de Packing List', 'Lista de chequeo',  '100%',          <Badge key="1" variant="ok">Pasa</Badge>,   'Por entrega'],
                  ['2', 'Peso de materia prima',         '1 rollo de cada 5','98%',           <Badge key="2" variant="ok">Pasa</Badge>,   'Por entrega'],
                  ['3', 'Tiempo de descarga',            'Medición directa', '1h 45min prom.',<Badge key="3" variant="ok">Pasa</Badge>,   'Por entrega'],
                  ['4', 'Entrega documentación',         'Max 1 día hábil',  '92%',           <Badge key="4" variant="warn">Atención</Badge>, 'Por entrega'],
                  ['5', 'Cumplimiento al proceso',       'Auditoría interna','95%',           <Badge key="5" variant="ok">Pasa</Badge>,   '2x mes'],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'kpi-egreso' && (
        <>
          <Topbar crumbs="Indicadores / Egreso" title="Indicadores del proceso de egreso" processCode="MT-PC-002 § 6" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Egresos del mes" value={egresos.length} variant="red" />
              <Stat label="Usando empezados" value={`${Math.round((egresos.filter((e) => e.empezadosUsados > 0).length / egresos.length) * 100)}%`} variant="ok" delta={{ text: 'política · usar excedentes primero' }} />
              <Stat label="Sin incidencia" value="100%" variant="ok" />
            </div>
            <Panel title="Cumplimiento de política de egreso" code="MT-PC-002 § 3">
              <div style={{ padding: 18, ...fontBody, fontSize: 13, color: '#444' }}>
                <ul style={{ marginLeft: 16, lineHeight: 1.8 }}>
                  <li>✓ Material liberado solo después de confirmación de Cobranza</li>
                  <li>✓ Verificación SAE vs físico antes de surtir</li>
                  <li>✓ Prioridad de rollos empezados antes de rollos nuevos</li>
                  <li>✓ Documento MT-DT-002 con firmas de conformidad en 100% de egresos</li>
                </ul>
              </div>
            </Panel>
          </div>
        </>
      )}

      {view === 'kpi-produccion' && (
        <>
          <Topbar crumbs="Indicadores / Producción" title="Indicadores del proceso de producción" processCode="MT-PC-003 § 6" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Indicadores formales según MT-PC-003-2026">
              <Table cols={['#', 'Indicador', 'Métrica', 'Resultado', 'Cumplimiento']}
                rows={[
                  ['1', 'Cumplimiento egreso material',         '% abastecimiento producción', '97%', <Badge key="1" variant="ok">Pasa</Badge>],
                  ['2', 'Cumplimiento especificaciones',        '100% por pedido',             '94%', <Badge key="2" variant="warn">Atención</Badge>],
                  ['3', 'Entrega de material (sobrante/defecto)', 'Cifras reportadas',         '89%', <Badge key="3" variant="warn">Atención</Badge>],
                  ['4', 'Manejo de inventario',                 'SAE vs físico',               '96%', <Badge key="4" variant="ok">Pasa</Badge>],
                ]} />
            </Panel>
            <Panel title="Verificación de pesaje — semana" code="MT-PC-003 act. 39-40">
              <Table cols={['Pedido', 'Material', 'Teórico', 'Real', 'Δ', 'Verificado']}
                rows={productosTerminados.map((pt) => {
                  const diff = ((pt.pesoReal - pt.pesoTeorico) / pt.pesoTeorico * 100).toFixed(1)
                  return [
                    pt.pedido, pt.material, `${pt.pesoTeorico} kg`, `${pt.pesoReal} kg`,
                    <Badge key="d" variant={Math.abs(parseFloat(diff)) < 5 ? 'ok' : 'bad'}>{parseFloat(diff) > 0 ? '+' : ''}{diff}%</Badge>,
                    pt.verificado ? <Check key="v" size={14} color={brand.ok} /> : <X key="v" size={14} color={brand.red} />,
                  ]
                })} />
            </Panel>
          </div>
        </>
      )}

      {view === 'productividad' && (
        <>
          <Topbar crumbs="Análisis / Productividad" title="Productividad por operador" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Piezas/hora prom." value="38.5" variant="red" delta={{ up: true, text: '12%' }} />
              <Stat label="Operador top" value="Eva" delta={{ text: '91% eficiencia' }} />
              <Stat label="Línea más eficiente" value="Costura 2" variant="ok" />
              <Stat label="Horas extra" value="14h" variant="warn" />
            </div>
            <Panel title="Productividad por operador (datos reales del Excel)" code="MT-PC-003 § 6">
              <Table cols={['Operador', 'Tipo', 'Línea', 'Prom. mL/hr', 'Turnos', 'Cumplimiento']}
                rows={operators.filter((o) => o.role === ROLES.OPERADOR && o.promedioMLhr).sort((a, b) => (b.promedioMLhr || 0) - (a.promedioMLhr || 0)).map((op) => {
                  const turnos = productividad.filter((p) => p.operador === op.name).length
                  const eff = Math.min(100, Math.round(((op.promedioMLhr || 0) / 500) * 100))
                  return [
                    <b key="n" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: op.color, color: 'white', display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 900 }}>{op.initial}</span>
                      {op.name}
                    </b>,
                    <Badge key="t" variant="red">Tipo {op.tipo}</Badge>,
                    <span key="l" style={{ ...fontMono, fontSize: 12, fontWeight: 600 }}>{EMOJI_LINEA[op.linea] || ''} {op.linea}</span>,
                    <b key="p">{op.promedioMLhr} mL/hr</b>,
                    turnos || '—',
                    <Badge key="e" variant={eff >= 80 ? 'ok' : eff >= 50 ? 'warn' : 'bad'}>{eff}%</Badge>,
                  ]
                })} />
            </Panel>
          </div>
        </>
      )}

      {view === 'costos' && (
        <>
          <Topbar crumbs="Análisis / Costos" title="Análisis de costos" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Costo MP semana"  value="$324,580" variant="ok" />
              <Stat label="Costo mano obra"  value="$98,420" />
              <Stat label="Costo merma"      value="$28,470" variant="bad" />
              <Stat label="Margen estimado"  value="32%"      variant="red" delta={{ up: true, text: 'meta 30%' }} />
            </div>
            <Panel title="Costo por pedido">
              <Table cols={['Pedido', 'MP', 'M.O.', 'Merma', 'Total', 'Vs estándar']}
                rows={orders.slice(0, 5).map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  `$${(o.m2 * 8).toLocaleString()}`,
                  `$${(o.m2 * 2).toLocaleString()}`,
                  `$${(o.m2 * 0.15).toLocaleString()}`,
                  `$${(o.m2 * 10.15).toLocaleString()}`,
                  <Badge key="b" variant={o.estado === 'stock-faltante' ? 'bad' : 'ok'}>{o.estado === 'stock-faltante' ? '+8%' : '-2%'}</Badge>,
                ])} />
            </Panel>
          </div>
        </>
      )}

      {view === 'pedidos' && (
        <>
          <Topbar crumbs="Análisis / Pedidos" title="Pedidos en sistema SAE" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Todos los pedidos en flujo">
              <Table cols={['Pedido', 'Cliente', 'Producto', 'M²', 'Compromiso', 'Pago', 'Material', 'Estado']}
                rows={orders.map((o) => [
                  <b key="p" style={{ color: brand.red }}>{o.id}</b>,
                  o.cliente, `${o.material} ${o.medida}`, `${o.m2.toLocaleString()} m²`, o.compromiso,
                  o.pagoConfirmado ? <Check key="pa" size={14} color={brand.ok} /> : <X key="pa" size={14} color={brand.red} />,
                  o.materialEgresado ? <Check key="m" size={14} color={brand.ok} /> : <X key="m" size={14} color={brand.red} />,
                  <OrderStatusPill key="s" estado={o.estado} />,
                ])} />
            </Panel>
          </div>
        </>
      )}
    </WebShell>
  )
}
