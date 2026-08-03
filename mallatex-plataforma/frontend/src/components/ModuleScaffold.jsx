'use client'

import { Construction } from 'lucide-react'
import { PageHeader } from './ui/PageHeader'
import { Card } from './ui/Card'
import { Loading } from './ui/States'
import { useData, asList } from '@/lib/useData'

// Andamiaje para módulos con versión representativa: cablea el endpoint real
// del gateway (si se indica) y muestra el conteo + una nota TODO. Garantiza que
// toda ruta del menú renderice sin romperse.
export function ModuleScaffold({ title, subtitle, code, endpoint, note }) {
  const { data, loading, error } = useData(endpoint || null)
  const list = asList(data)
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} code={code} />
      <Card title="Estado del módulo">
        <div className="card-body">
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <Construction size={20} style={{ color: 'var(--warn)' }} />
            <strong>Versión representativa</strong>
          </div>
          <p className="muted" style={{ marginBottom: 12 }}>
            {note ||
              'Pantalla con el cableado de datos y navegación listos. La UI operativa completa se implementa en una iteración posterior.'}
          </p>
          {endpoint && (
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              Origen de datos: <code className="mono">{endpoint}</code>
              {loading ? (
                ' · consultando…'
              ) : error ? (
                ` · el gateway respondió: ${error.message}`
              ) : (
                ` · ${list.length} registro(s) disponibles.`
              )}
            </div>
          )}
          {/* TODO: construir la UI operativa específica de este módulo. */}
        </div>
      </Card>
      {loading && <Loading />}
    </div>
  )
}
