'use client'

import Link from 'next/link'
import { ShieldCheck, Users, Smartphone, SlidersHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Roles web (VALID_ROLES del servicio de identidad) con descripción funcional.
const WEB_ROLES = [
  { key: 'admin', label: 'Administrador', desc: 'Acceso total a la plataforma. Por regla de dominio siempre recibe todos los módulos; administra usuarios, catálogos y la matriz de acceso.' },
  { key: 'contador', label: 'Contador', desc: 'Contabilidad y finanzas: facturación, cuentas por cobrar/pagar y reportes contables de la operación.' },
  { key: 'nomina', label: 'Nómina', desc: 'Gestión de personal: empleados, horarios, asistencia, incidencias y cálculo de nómina.' },
  { key: 'comercial', label: 'Comercial', desc: 'Área de ventas: clientes, prospectos, cotizaciones, pedidos y seguimiento comercial (CRM).' },
  { key: 'marketing', label: 'Marketing', desc: 'Banco de imágenes, formatos, publicaciones, calendario de campañas e inventario de impresos.' },
  { key: 'produccion', label: 'Producción', desc: 'Planta y manufactura: órdenes de producción, tableros MES, inventarios y control de línea.' },
  { key: 'direccion', label: 'Dirección', desc: 'Vista directiva: indicadores, tableros y reportes ejecutivos de todas las áreas, en modo consulta.' },
]

// Perfiles de la app móvil / portal del empleado.
const MOBILE_PROFILES = [
  { key: 'comercial', label: 'Perfil comercial', desc: 'Vendedores en campo: checada con geocerca en sitios de cliente, visitas y levantamiento de pedidos desde el móvil.' },
  { key: 'operativo', label: 'Perfil operativo', desc: 'Personal operativo y de obra: checada de asistencia validada contra geocercas y consulta de su información en el portal.' },
  { key: 'linea', label: 'Perfil de línea (MES)', desc: 'Operadores de línea de producción: registro de producción y consumo en los tableros MES desde estaciones móviles.' },
]

function countGrants(grants, surface, subjectType, subjectKey) {
  return grants.filter(
    (g) => g.surface === surface && g.subjectType === subjectType && g.subjectKey === subjectKey
  ).length
}

// Configuración · Roles. Catálogo estático enriquecido con /api/users y
// /api/access/matrix (conteo de usuarios y módulos concedidos por sujeto).
export default function RolesPage() {
  const usersQ = useData('/api/users')
  const matrixQ = useData('/api/access/matrix')

  const users = asList(usersQ.data)
  const grants = matrixQ.data?.grants || []
  const catalog = matrixQ.data?.catalog || {}
  const loading = (usersQ.loading && !usersQ.data) || (matrixQ.loading && !matrixQ.data)

  const usersByRole = users.reduce((acc, u) => {
    if (u.role) acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  const cardStyle = { display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', border: '1px solid var(--line)', borderRadius: 10, background: '#fff' }
  const gridStyle = { gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Roles administrativos (web) y perfiles de la app móvil"
        code="MT-CFG-ROL"
        actions={
          <Link href="/config/asignacion" className="btn btn-primary">
            <SlidersHorizontal size={16} /> Asignación de acceso
          </Link>
        }
      />
      {usersQ.error && <ErrorState error={usersQ.error} />}
      {matrixQ.error && <ErrorState error={matrixQ.error} />}

      {loading ? (
        <Card title="Roles"><Loading /></Card>
      ) : (
        <>
          <Card title="Roles web" actions={<Users size={16} className="muted" />}>
            <div className="card-body">
              <div className="grid" style={gridStyle}>
                {WEB_ROLES.map((r) => {
                  const nUsers = usersByRole[r.key] || 0
                  const nMods = r.key === 'admin'
                    ? (catalog.web || []).length
                    : countGrants(grants, 'web', 'role', r.key)
                  return (
                    <div key={r.key} style={cardStyle}>
                      <div className="row" style={{ gap: 8 }}>
                        <strong>{r.label}</strong>
                        <span className="mono muted" style={{ fontSize: 11 }}>{r.key}</span>
                        {r.key === 'admin' && <Badge variant="red">total</Badge>}
                      </div>
                      <p className="muted" style={{ fontSize: 12, margin: 0, flex: 1 }}>{r.desc}</p>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Badge variant="info">{nUsers} usuario(s)</Badge>
                        <Badge variant={nMods ? 'ok' : 'muted'}>
                          {nMods} módulo(s) web{r.key === 'admin' ? ' (todos)' : ''}
                        </Badge>
                      </div>
                      <Link href="/config/asignacion" className="btn" style={{ alignSelf: 'flex-start' }}>
                        Editar módulos de este rol
                      </Link>
                    </div>
                  )
                })}
              </div>
              <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
                <ShieldCheck size={14} style={{ verticalAlign: '-2px' }} /> El rol <b>admin</b> siempre recibe todos los
                módulos (regla de dominio). El resto se controla desde la matriz de asignación.
              </div>
            </div>
          </Card>

          <Card title="Perfiles móviles" actions={<Smartphone size={16} className="muted" />}>
            <div className="card-body">
              <div className="grid" style={gridStyle}>
                {MOBILE_PROFILES.map((p) => {
                  const nMobile = countGrants(grants, 'mobile', 'profile', p.key)
                  const nPortal = countGrants(grants, 'portal', 'profile', p.key)
                  return (
                    <div key={p.key} style={cardStyle}>
                      <div className="row" style={{ gap: 8 }}>
                        <strong>{p.label}</strong>
                        <span className="mono muted" style={{ fontSize: 11 }}>{p.key}</span>
                      </div>
                      <p className="muted" style={{ fontSize: 12, margin: 0, flex: 1 }}>{p.desc}</p>
                      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                        <Badge variant={nMobile ? 'ok' : 'muted'}>{nMobile} módulo(s) móvil</Badge>
                        <Badge variant={nPortal ? 'ok' : 'muted'}>{nPortal} módulo(s) portal</Badge>
                      </div>
                      <Link href="/config/asignacion" className="btn" style={{ alignSelf: 'flex-start' }}>
                        Editar módulos de este perfil
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
