'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, X, Clock } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'
import { post, put, del } from '@/lib/api'

// Días ISO 1..7 → etiqueta corta (L-M-M-J-V-S-D).
const DAYS = [
  { n: 1, label: 'L', full: 'Lunes' },
  { n: 2, label: 'M', full: 'Martes' },
  { n: 3, label: 'M', full: 'Miércoles' },
  { n: 4, label: 'J', full: 'Jueves' },
  { n: 5, label: 'V', full: 'Viernes' },
  { n: 6, label: 'S', full: 'Sábado' },
  { n: 7, label: 'D', full: 'Domingo' },
]

function DayChips({ workDays = [], onToggle }) {
  const set = new Set((workDays || []).map(Number))
  return (
    <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
      {DAYS.map((d) => {
        const on = set.has(d.n)
        const style = {
          width: 30, height: 30, minHeight: 30, borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          border: `1px solid ${on ? 'var(--red)' : 'var(--line)'}`,
          background: on ? 'var(--red)' : '#fff',
          color: on ? '#fff' : '#999',
          cursor: onToggle ? 'pointer' : 'default',
          padding: 0,
        }
        return onToggle ? (
          <button key={d.n} type="button" title={d.full} style={style} onClick={() => onToggle(d.n)}>
            {d.label}
          </button>
        ) : (
          <span key={d.n} title={d.full} style={style}>{d.label}</span>
        )
      })}
    </div>
  )
}

const EMPTY_FORM = {
  name: '', entryTime: '08:00', exitTime: '18:00',
  lunchMinutes: 60, toleranceMinutes: 10, lateAfterMinutes: 15,
  hoursPerDay: 8, workDays: [1, 2, 3, 4, 5],
}

// Catálogo · Horarios (turnos). Consume /api/schedules (GET/POST/PUT/DELETE).
export default function HorariosPage() {
  const { data, loading, error, reload } = useData('/api/schedules')
  const rows = asList(data)
  const [form, setForm] = useState(null) // null=cerrado, sin id=alta, con id=edición
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState('') // feedback global (incluye 409 de baja)
  const [formMsg, setFormMsg] = useState('')

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setFormMsg('')
    setMsg('')
  }

  function openEdit(s) {
    setForm({
      id: s.id,
      name: s.name || '',
      entryTime: s.entryTime || '08:00',
      exitTime: s.exitTime || '18:00',
      lunchMinutes: s.lunchMinutes ?? 60,
      toleranceMinutes: s.toleranceMinutes ?? 10,
      lateAfterMinutes: s.lateAfterMinutes ?? 15,
      hoursPerDay: s.hoursPerDay ?? 8,
      workDays: Array.isArray(s.workDays) ? s.workDays.map(Number) : [1, 2, 3, 4, 5],
    })
    setFormMsg('')
    setMsg('')
  }

  function toggleDay(n) {
    const set = new Set(form.workDays.map(Number))
    set.has(n) ? set.delete(n) : set.add(n)
    setForm({ ...form, workDays: [...set].sort((a, b) => a - b) })
  }

  async function save(e) {
    e.preventDefault()
    if (!form.workDays.length) {
      setFormMsg('Selecciona al menos un día laboral.')
      return
    }
    setSaving(true)
    setFormMsg('')
    try {
      const body = {
        name: form.name,
        entryTime: form.entryTime,
        exitTime: form.exitTime,
        lunchMinutes: Number(form.lunchMinutes),
        toleranceMinutes: Number(form.toleranceMinutes),
        lateAfterMinutes: Number(form.lateAfterMinutes),
        hoursPerDay: Number(form.hoursPerDay),
        workDays: form.workDays.map(Number),
      }
      if (form.id) {
        await put(`/api/schedules/${form.id}`, body)
        setMsg('Turno actualizado.')
      } else {
        await post('/api/schedules', body)
        setMsg('Turno creado.')
      }
      setForm(null)
      reload()
    } catch (err) {
      setFormMsg(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(s) {
    if (!window.confirm(`¿Eliminar el turno "${s.name}"?`)) return
    setBusyId(s.id)
    setMsg('')
    try {
      await del(`/api/schedules/${s.id}`)
      setMsg('Turno eliminado.')
      reload()
    } catch (err) {
      // 409: el turno tiene empleados asignados — se muestra el mensaje del servidor.
      setMsg(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const cols = ['Turno', 'Entrada', 'Salida', 'Comida', 'Tolerancia', 'Retardo tras', 'Hrs/día', 'Días', '']
  const tableRows = rows.map((s) => [
    <strong key="n">{s.name || '—'}</strong>,
    <span key="e" className="mono">{s.entryTime || '—'}</span>,
    <span key="x" className="mono">{s.exitTime || '—'}</span>,
    `${s.lunchMinutes ?? 0} min`,
    `${s.toleranceMinutes ?? 0} min`,
    `${s.lateAfterMinutes ?? 0} min`,
    <Badge key="h" variant="info">{s.hoursPerDay ?? '—'} h</Badge>,
    <DayChips key="d" workDays={s.workDays} />,
    <div key="a" className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
      <button className="icon-btn" title="Editar" onClick={() => openEdit(s)}><Pencil size={16} /></button>
      <button className="icon-btn" title="Eliminar" disabled={busyId === s.id} onClick={() => remove(s)}>
        <Trash2 size={16} />
      </button>
    </div>,
  ])

  return (
    <div>
      <PageHeader
        title="Horarios"
        subtitle="Turnos y horarios laborales"
        code="MT-CAT-HOR"
        actions={
          <button className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Nuevo turno
          </button>
        }
      />
      {error && <ErrorState error={error} />}
      {msg && <div className="alert alert-info">{msg}</div>}

      {form && (
        <Card
          title={form.id ? 'Editar turno' : 'Nuevo turno'}
          actions={<button className="icon-btn" onClick={() => setForm(null)}><X size={18} /></button>}
        >
          <form className="card-body" onSubmit={save}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))' }}>
              <label>Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label>Hora de entrada
                <input type="time" value={form.entryTime} onChange={(e) => setForm({ ...form, entryTime: e.target.value })} required />
              </label>
              <label>Hora de salida
                <input type="time" value={form.exitTime} onChange={(e) => setForm({ ...form, exitTime: e.target.value })} required />
              </label>
              <label>Comida (min)
                <input type="number" min="0" value={form.lunchMinutes} onChange={(e) => setForm({ ...form, lunchMinutes: e.target.value })} required />
              </label>
              <label>Tolerancia (min)
                <input type="number" min="0" value={form.toleranceMinutes} onChange={(e) => setForm({ ...form, toleranceMinutes: e.target.value })} required />
              </label>
              <label>Retardo después de (min)
                <input type="number" min="0" value={form.lateAfterMinutes} onChange={(e) => setForm({ ...form, lateAfterMinutes: e.target.value })} required />
              </label>
              <label>Horas por día
                <input type="number" min="1" max="24" step="0.5" value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: e.target.value })} required />
              </label>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Días laborales</div>
              <DayChips workDays={form.workDays} onToggle={toggleDay} />
            </div>
            {formMsg && <div className="alert alert-err" style={{ marginTop: 12 }}>{formMsg}</div>}
            <div className="page-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Turnos" actions={<Clock size={16} className="muted" />}>
        {loading && !data ? <Loading /> : <Table cols={cols} rows={tableRows} empty="Sin turnos registrados" />}
      </Card>
    </div>
  )
}
