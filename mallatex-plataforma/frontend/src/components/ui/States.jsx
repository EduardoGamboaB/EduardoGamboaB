import { Inbox } from 'lucide-react'

export function Loading({ label = 'Cargando…' }) {
  return (
    <div className="state">
      <div className="spinner" />
      {label}
    </div>
  )
}

export function Empty({ title = 'Sin datos', hint, icon: Icon = Inbox }) {
  return (
    <div className="state">
      <Icon size={30} style={{ opacity: 0.4, marginBottom: 8 }} />
      <h4>{title}</h4>
      {hint && <p>{hint}</p>}
    </div>
  )
}

export function ErrorState({ error }) {
  return (
    <div className="alert alert-err">
      {error?.message || String(error) || 'Ocurrió un error al cargar la información.'}
    </div>
  )
}
