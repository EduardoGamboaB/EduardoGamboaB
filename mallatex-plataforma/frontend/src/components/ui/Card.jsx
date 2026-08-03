import { ProcessTag } from './ProcessTag'

// Panel con cabecera. `code` renderiza un ProcessTag (convención MES MT-PC-XXX).
export function Card({ title, code, actions, children, pad = false }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      {(title || actions) && (
        <div className="card-head">
          {title && <h3>{title}</h3>}
          {code && <ProcessTag code={code} />}
          <div className="spacer" />
          {actions}
        </div>
      )}
      {pad ? <div className="card-body">{children}</div> : children}
    </section>
  )
}
