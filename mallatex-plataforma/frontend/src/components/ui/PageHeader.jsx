import { ProcessTag } from './ProcessTag'

export function PageHeader({ title, subtitle, code, actions }) {
  return (
    <header className="page-head">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div className="row wrap" style={{ gap: 10 }}>
          <h2>{title}</h2>
          {code && <ProcessTag code={code} />}
        </div>
      </div>
      {subtitle && <p>{subtitle}</p>}
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}
