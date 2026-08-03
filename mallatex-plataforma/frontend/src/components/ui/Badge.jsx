// Badge de estado. variant: ok | warn | bad | info | muted | red
export function Badge({ children, variant = 'muted' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
