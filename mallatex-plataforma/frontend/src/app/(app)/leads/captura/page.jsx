'use client'

import { useState } from 'react'
import { UserPlus, CalendarCheck2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post } from '@/lib/api'
import { brand, fontDisplay } from '@/lib/brand'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const digitos = (s) => (String(s || '').match(/\d/g) || []).length

// Estados de la República (el catálogo /api/leads/meta no los incluye).
const ESTADOS = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas',
  'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas', 'Otro / extranjero',
]

const FORM_VACIO = {
  nombre: '', empresa: '', estado: '', email: '', telefono: '',
  cargo: '', interes: '', fuente: '', notas: '', consentimiento: false,
}

const fecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

// Leads · Captura — registro manual de prospectos por el personal del stand.
// Consume /api/leads/meta (catálogos), /api/events/public/active (evento) y
// POST /api/leads (con manejo de duplicados 409 + forzar).
export default function CapturaPage() {
  const meta = useData('/api/leads/meta')
  const evento = useData('/api/events/public/active')
  const ev = evento.data || meta.data?.event || null
  const recientes = useData(ev?.id ? `/api/leads?event=${ev.id}` : null)

  const [form, setForm] = useState(FORM_VACIO)
  const [errs, setErrs] = useState({})
  const [saving, setSaving] = useState(false)
  const [dup, setDup] = useState(null) // info del duplicado (409)
  const [okFolio, setOkFolio] = useState(null)
  const [msg, setMsg] = useState('')

  const intereses = meta.data?.intereses || []
  const fuentes = meta.data?.fuentes || []
  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function validar() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (form.telefono && digitos(form.telefono) !== 10) e.telefono = 'El teléfono debe tener 10 dígitos'
    if (form.email && !EMAIL_RE.test(form.email.trim())) e.email = 'Correo no válido'
    if (!form.telefono && !form.email) e.contacto = 'Captura al menos teléfono o correo'
    setErrs(e)
    return Object.keys(e).length === 0
  }

  async function enviar(forzar = false) {
    if (!validar()) return
    setSaving(true)
    setMsg('')
    if (!forzar) setDup(null)
    try {
      const res = await post('/api/leads', { event: ev?.id, ...form, forzar })
      setOkFolio(res?.folio || '')
      setForm(FORM_VACIO)
      setErrs({})
      setDup(null)
      recientes.reload()
    } catch (e) {
      if (e.status === 409) {
        setDup(e.body?.details?.duplicado || {})
      } else {
        setMsg(`No se pudo registrar: ${e.message}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const leads = asList(recientes.data)
  const total = Number(recientes.data?.total ?? leads.length)
  const cols = ['Folio', 'Nombre', 'Empresa', 'Interés', 'Fuente', 'Fecha']
  const tableRows = leads.map((l) => [
    <span key="f" className="mono">{l.folio || '—'}</span>,
    <strong key="n">{l.nombre || '—'}</strong>,
    l.empresa || '—',
    l.interes ? <Badge key="i" variant="info">{l.interes}</Badge> : '—',
    l.fuente || '—',
    fecha(l.createdAt),
  ])

  const inputErr = (k) => (errs[k] ? { borderColor: brand.bad } : undefined)
  const cargando = (meta.loading && !meta.data) || (evento.loading && !evento.data && !evento.error)

  return (
    <div>
      <PageHeader title="Captura de leads" subtitle="Registro manual de prospectos en el evento" code="MT-LEAD-001" />
      {msg && <div className="alert alert-err">{msg}</div>}
      {meta.error && <ErrorState error={meta.error} />}

      {cargando ? (
        <Loading />
      ) : ev ? (
        <div className="alert alert-info row wrap" style={{ gap: 8 }}>
          <CalendarCheck2 size={16} />
          <span>
            Evento activo: <strong>{ev.name}</strong>
            {ev.edition ? ` · ${ev.edition}` : ''} {ev.lugar ? ` · ${ev.lugar}` : ''}
          </span>
        </div>
      ) : (
        <div className="alert alert-err row wrap" style={{ gap: 8 }}>
          <AlertTriangle size={16} />
          <span>No hay un evento activo: activa un evento en <strong>Leads · Eventos</strong> para capturar.</span>
        </div>
      )}

      {okFolio != null && (
        <Card>
          <div className="card-body" style={{ textAlign: 'center', padding: '26px 16px' }}>
            <CheckCircle2 size={36} style={{ color: brand.ok, marginBottom: 8 }} />
            <p className="muted">Lead registrado con folio</p>
            <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 40, color: brand.red, letterSpacing: '.03em' }}>
              {okFolio || '—'}
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn btn-sm" onClick={() => setOkFolio(null)}>Capturar otro</button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Nuevo lead" code="MT-LEAD-001">
        <form
          className="card-body"
          onSubmit={(e) => {
            e.preventDefault()
            enviar(false)
          }}
        >
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))' }}>
            <label>Nombre *
              <input value={form.nombre} onChange={set('nombre')} style={inputErr('nombre')} placeholder="Nombre completo" />
              {errs.nombre && <small style={{ color: brand.bad }}>{errs.nombre}</small>}
            </label>
            <label>Empresa
              <input value={form.empresa} onChange={set('empresa')} placeholder="Rancho / empresa" />
            </label>
            <label>Estado
              <select value={form.estado} onChange={set('estado')}>
                <option value="">— Selecciona —</option>
                {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>Correo
              <input type="email" value={form.email} onChange={set('email')} style={inputErr('email')} placeholder="correo@empresa.com" />
              {errs.email && <small style={{ color: brand.bad }}>{errs.email}</small>}
            </label>
            <label>Teléfono
              <input inputMode="numeric" value={form.telefono} onChange={set('telefono')} style={inputErr('telefono')} placeholder="10 dígitos" />
              {errs.telefono && <small style={{ color: brand.bad }}>{errs.telefono}</small>}
            </label>
            <label>Cargo
              <input value={form.cargo} onChange={set('cargo')} placeholder="Puesto / cargo" />
            </label>
            <label>Interés
              <select value={form.interes} onChange={set('interes')}>
                <option value="">— Selecciona —</option>
                {intereses.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
            <label>Fuente
              <select value={form.fuente} onChange={set('fuente')}>
                <option value="">— Selecciona —</option>
                {fuentes.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>Notas
              <textarea value={form.notas} onChange={set('notas')} placeholder="Comentarios de la conversación…" />
            </label>
          </div>

          <label className="row" style={{ marginTop: 12, gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.consentimiento}
              onChange={set('consentimiento')}
              style={{ width: 18, height: 18, minHeight: 0, flexShrink: 0 }}
            />
            El prospecto acepta ser contactado (consentimiento de datos).
          </label>

          {errs.contacto && <div className="alert alert-err" style={{ marginTop: 12 }}>{errs.contacto}</div>}

          {dup && (
            <div className="alert" style={{ marginTop: 12, background: brand.warnBg, color: brand.warn, border: '1px solid #F1E2C0' }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <AlertTriangle size={16} />
                <span>
                  Ya existe un lead con ese correo o teléfono en este evento
                  {dup.nombre ? <>: <strong>{dup.nombre}</strong></> : ''}.
                </span>
                <button type="button" className="btn btn-sm btn-dark" onClick={() => enviar(true)} disabled={saving}>
                  {saving ? 'Registrando…' : 'Registrar de todos modos'}
                </button>
              </div>
            </div>
          )}

          <div className="page-actions">
            <button className="btn btn-primary" type="submit" disabled={saving || !ev}>
              <UserPlus size={16} /> {saving ? 'Registrando…' : 'Registrar lead'}
            </button>
            <button className="btn" type="button" onClick={() => { setForm(FORM_VACIO); setErrs({}); setDup(null) }}>
              Limpiar
            </button>
          </div>
        </form>
      </Card>

      {ev?.id && (
        <Card title="Leads recientes del evento" actions={<span className="muted" style={{ fontSize: 12.5 }}>{total} en total</span>}>
          {recientes.error && <ErrorState error={recientes.error} />}
          {recientes.loading && !recientes.data ? (
            <Loading />
          ) : (
            <Table cols={cols} rows={tableRows} empty="Aún no hay leads en este evento" />
          )}
        </Card>
      )}
    </div>
  )
}
