'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart3, RefreshCw, ShieldCheck, FileWarning, Archive, FileText,
  Download, Plus, Check, AlertCircle, Mail, Camera, Eye,
} from 'lucide-react'
import { brand, fontBody, fontDisplay, fontMono } from '@/mes/lib/brand'
import { ROLE_PROFILES } from '@/mes/lib/constants'
import { useApp } from '@/mes/lib/store'
import { WebShell, MenuItem } from '@/mes/components/shell/WebShell'
import { Topbar } from '@/mes/components/shell/Topbar'
import { Btn } from '@/mes/components/shell/Btn'
import { Stat } from '@/mes/components/shell/Stat'
import { Panel } from '@/mes/components/shell/Panel'
import { Table } from '@/mes/components/shell/Table'
import { Badge } from '@/mes/components/ui/Badge'
import { ProcessTag } from '@/mes/components/ui/ProcessTag'

export function OperacionesApp() {
  const router = useRouter()
  const onExit = () => router.push('/mes')
  const [view, setView] = useState('panel')
  const { orders, recepciones, egresos } = useApp()

  const menuItems: MenuItem[] = [
    { full: true, hint: true, id: 'panel', emoji: '📊', icon: BarChart3, label: 'Panel' },
    { section: 'Coordinación' },
    { id: 'sae', emoji: '🔄', icon: RefreshCw, label: 'Sistema SAE' },
    { id: 'auditoria', emoji: '🛡️', icon: ShieldCheck, label: 'Auditoría procesos' },
    { section: 'Proveedores' },
    { id: 'reclamos', emoji: '⚠️', icon: FileWarning, label: 'Reclamos' },
    { id: 'devoluciones', emoji: '↩️', icon: Archive, label: 'Devoluciones' },
    { section: 'Reportes' },
    { id: 'documentos', emoji: '📄', icon: FileText, label: 'Documentos' },
  ]

  return (
    <WebShell perfil="Operaciones" profileData={ROLE_PROFILES.operaciones} currentView={view} onChangeView={setView} onExit={onExit} menuItems={menuItems}>
      {view === 'panel' && (
        <>
          <Topbar crumbs="Operaciones / Panel" title="Coordinador de Operaciones"
            actions={<><Btn variant="ghost" icon={Download}>Reporte semanal</Btn><Btn variant="primary" icon={RefreshCw}>Sync SAE</Btn></>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              <Stat label="Pedidos en flujo" value={orders.filter((o) => o.estado !== 'entregado').length} variant="red" />
              <Stat label="Recepciones mes" value={recepciones.length} />
              <Stat label="Egresos mes" value={egresos.length} variant="ok" />
              <Stat label="Por registrar SAE" value={recepciones.filter((r) => !r.ingresadoSAE).length} variant="warn" delta={{ text: 'máx 1 día hábil' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <Panel title="Resumen de procesos activos">
                <div style={{ padding: 14 }}>
                  {[
                    { code: 'MT-PC-001', name: 'Ingreso de material', count: recepciones.length, color: brand.ok },
                    { code: 'MT-PC-002', name: 'Egreso de material', count: egresos.length, color: brand.red },
                    { code: 'MT-PC-003', name: 'Producción', count: orders.filter((o) => o.estado === 'en-produccion').length, color: brand.warn },
                  ].map((p) => (
                    <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${brand.line}` }}>
                      <div style={{ width: 6, height: 36, background: p.color }} />
                      <ProcessTag code={p.code} />
                      <div style={{ flex: 1, ...fontDisplay, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{p.name}</div>
                      <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 22, color: p.color }}>{p.count}</div>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Indicadores del proceso de ingreso" code="MT-PC-001 § 6">
                <div style={{ padding: 14 }}>
                  {[
                    { label: 'Verificación Packing List', val: '100%', ok: true },
                    { label: 'Peso de materia prima', val: '98%', ok: true },
                    { label: 'Tiempo de descarga', val: '< 2h prom.', ok: true },
                    { label: 'Entrega de documentación', val: '92%', ok: false },
                    { label: 'Cumplimiento al proceso', val: '95%', ok: true },
                  ].map((i, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${brand.line}` }}>
                      <div style={{ ...fontBody, fontSize: 13 }}>{i.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <b style={{ ...fontMono, fontSize: 13 }}>{i.val}</b>
                        {i.ok ? <Check size={14} color={brand.ok} /> : <AlertCircle size={14} color={brand.warn} />}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <Panel title="Material con defecto / sobrante para procesar en SAE" code="MT-PC-003 act. 49">
              <Table cols={['Pedido', 'Material', 'Tipo', 'Cantidad', 'Acción']}
                rows={[
                  ['VFGC872', 'Malla Raschel 35% B', 'Defecto', '3.5 m', <Btn key="b1" variant="primary" icon={Mail}>Notificar proveedor</Btn>],
                  ['VFGC861', 'Cubrenegro 105gr', 'Sobrante', '12.5 m', <Btn key="b2" variant="ok" icon={Archive}>Retornar almacén</Btn>],
                  ['VEG1082', 'Monofila Blanco', 'Desperdicio', '1.5 m', <Btn key="b3" variant="ghost">Registrar</Btn>],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'sae' && (
        <>
          <Topbar crumbs="Operaciones / SAE" title="Movimientos en sistema SAE"
            actions={<Btn variant="primary" icon={RefreshCw}>Sincronizar</Btn>} />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: brand.white, border: `1px solid ${brand.line}`, padding: 18, borderRadius: 4, marginBottom: 20, borderLeft: `3px solid ${brand.red}` }}>
              <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.2em', color: brand.red, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Movimientos de inventario</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#444' }}>
                Operaciones realiza los traspasos entre almacenes del sistema SAE: <b>Materia prima → Producción → Producto terminado</b>. También registra defectos, sobrantes y desperdicios.
              </div>
            </div>
            <Panel title="Últimos movimientos SAE">
              <Table cols={['Fecha', 'Tipo', 'Origen', 'Destino', 'Material', 'Cantidad', 'Resp.']}
                rows={[
                  ['2026-05-24', 'Entrada',  'Proveedor',  'Almacén MP',   'Cubrenegro 105gr',                  '1450.5 kg', 'Víctor G.'],
                  ['2026-05-24', 'Traspaso', 'Almacén MP', 'Producción',   'Cubrenegro 105gr',                  '81.2 kg',   'Víctor G.'],
                  ['2026-05-24', 'Traspaso', 'Producción', 'PT',           'Cubrenegro 105gr × 1.30',           '21.5 kg',   'Víctor G.'],
                  ['2026-05-23', 'Traspaso', 'Producción', 'Defecto',      'Malla Raschel 35%',                 '3.5 m',     'Víctor G.'],
                  ['2026-05-23', 'Traspaso', 'Producción', 'Almacén MP',   'Cubrenegro 105gr (sobrante)',       '12.5 m',    'Víctor G.'],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'auditoria' && (
        <>
          <Topbar crumbs="Operaciones / Auditoría" title="Auditoría de cumplimiento de procesos" processCode="MT-PC-001 § 3" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ background: '#fff3cd', border: `1px solid ${brand.warn}`, padding: 14, borderRadius: 4, marginBottom: 20, ...fontBody, fontSize: 13, color: '#856404' }}>
              <b>Política:</b> Auditoría interna 2 veces por mes. Seleccionar caso aleatorio (preferentemente recientes) y verificar cumplimiento. Diferencias → aclaración con evidencia. Si es mala praxis reiterada → sanción + acta administrativa.
            </div>
            <Panel title="Auditorías recientes">
              <Table cols={['Fecha', 'Tipo', 'Caso auditado', 'Hallazgos', 'Cumplimiento', 'Acción']}
                rows={[
                  ['2026-05-15', 'Ingreso',    'REC-2026-0141', 'Sin observaciones',           <Badge key="1" variant="ok">100%</Badge>, 'Ninguna'],
                  ['2026-05-08', 'Egreso',     'EGR-2026-0285', 'Falta firma de conformidad',  <Badge key="2" variant="warn">85%</Badge>, 'Llamada de atención'],
                  ['2026-05-01', 'Producción', 'VFGC832',       'Documentos completos',        <Badge key="3" variant="ok">95%</Badge>, 'Ninguna'],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'reclamos' && (
        <>
          <Topbar crumbs="Operaciones / Reclamos" title="Reclamos a proveedores" processCode="MT-PC-001 act. 21-23" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Reclamos activos">
              <Table cols={['Fecha', 'Proveedor', 'Recepción', 'Motivo', 'Evidencia', 'Estado', 'Acción']}
                rows={[
                  ['2026-05-20', 'Polysembras SA', 'REC-2026-0140', 'Peso menor al declarado (-8%)',
                    <Btn key="e" variant="ghost" icon={Camera}>Ver</Btn>,
                    <Badge key="s" variant="warn">Esperando respuesta</Badge>,
                    <Btn key="a" variant="primary">Dar seguimiento</Btn>],
                ]} />
            </Panel>
          </div>
        </>
      )}

      {view === 'devoluciones' && (
        <>
          <Topbar crumbs="Operaciones / Devoluciones" title="Devoluciones a proveedor" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <Panel title="Historial de devoluciones">
              <div style={{ padding: 32, textAlign: 'center', color: '#999', ...fontBody }}>
                No hay devoluciones registradas en el periodo.
              </div>
            </Panel>
          </div>
        </>
      )}

      {view === 'documentos' && (
        <>
          <Topbar crumbs="Operaciones / Documentos" title="Documentos relacionados" />
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {[
                { code: 'MT-DT-001-2026', name: 'Recepción del material',          proc: 'MT-PC-001' },
                { code: 'MT-DT-002-2026', name: 'Entrega de material a producción',proc: 'MT-PC-002' },
                { code: 'MT-DT-003-2026', name: 'Control de material en producción', proc: 'MT-PC-003' },
                { code: 'MT-DT-004-2026', name: 'Control de conteo de rollos',     proc: 'MT-PC-003' },
                { code: 'MT-DT-005-2026', name: 'Retorno de material a almacén',    proc: 'MT-PC-003' },
                { code: 'MT-DT-006-2026', name: 'Check list de producto terminado', proc: 'MT-PC-003' },
              ].map((d) => (
                <div key={d.code} style={{ background: 'white', border: `1px solid ${brand.line}`, borderTop: `3px solid ${brand.red}`, borderRadius: 4, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <ProcessTag code={d.code} />
                    <div style={{ ...fontMono, fontSize: 9, color: '#888', letterSpacing: '0.15em', fontWeight: 600 }}>{d.proc}</div>
                  </div>
                  <h4 style={{ ...fontDisplay, fontWeight: 800, fontSize: 16, marginTop: 8, textTransform: 'uppercase' }}>{d.name}</h4>
                  <div style={{ marginTop: 14 }}>
                    <Btn variant="ghost" icon={Eye}>Ver formato</Btn>
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
