'use client'

import { useMemo } from 'react'
import { Download, Users, CheckCircle2, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Stat } from '@/components/ui/Stat'
import { Table } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Loading, ErrorState } from '@/components/ui/States'
import { useData, asList } from '@/lib/useData'

// Leads (Anaberries) · Dashboard — KPIs + tabla + exportación CSV en cliente.
export default function LeadsDashboardPage() {
  const stats = useData('/api/stats')
  const leads = useData('/api/leads')
  const rows = asList(leads.data)
  const s = stats.data || {}

  const total = s.total ?? rows.length
  const consent = s.consent ?? rows.filter((l) => l.consentimiento || l.consent).length
  const estados = useMemo(() => new Set(rows.map((l) => l.estado || l.state).filter(Boolean)).size, [rows])

  function exportCsv() {
    const header = ['folio', 'nombre', 'empresa', 'estado', 'email', 'telefono', 'interes', 'consentimiento', 'fuente']
    const lines = [header.join(',')]
    for (const l of rows) {
      const vals = [
        l.folio, l.nombre || l.name, l.empresa || l.company, l.estado || l.state,
        l.email, l.telefono || l.phone, l.interes || l.interest,
        l.consentimiento || l.consent ? 'sí' : 'no', l.fuente || l.source,
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      lines.push(vals.join(','))
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-mallatex-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cols = ['Folio', 'Nombre', 'Empresa', 'Estado', 'Interés', 'Consent.', 'Fuente']
  const tableRows = rows.map((l) => [
    <span key="f" className="mono">{l.folio || '—'}</span>,
    <strong key="n">{l.nombre || l.name || '—'}</strong>,
    l.empresa || l.company || '—',
    l.estado || l.state || '—',
    l.interes || l.interest || '—',
    <Badge key="c" variant={l.consentimiento || l.consent ? 'ok' : 'muted'}>
      {l.consentimiento || l.consent ? 'sí' : 'no'}
    </Badge>,
    l.fuente || l.source || '—',
  ])

  return (
    <div>
      <PageHeader
        title="Dashboard leads"
        subtitle="Captura de prospectos en eventos y ferias (Anaberries)"
        code="MT-LEAD-001"
        actions={
          <button className="btn btn-primary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download size={16} /> Exportar CSV
          </button>
        }
      />
      {(stats.error || leads.error) && <ErrorState error={stats.error || leads.error} />}
      {leads.loading && !leads.data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-stats" style={{ marginBottom: 16 }}>
            <Stat label="Leads totales" value={total} icon={Users} />
            <Stat label="Con consentimiento" value={consent} variant="ok" icon={CheckCircle2} />
            <Stat label="Estados alcanzados" value={estados} variant="warn" icon={MapPin} />
          </div>
          <Card title="Prospectos capturados">
            <Table cols={cols} rows={tableRows} empty="Sin leads capturados" />
          </Card>
        </>
      )}
    </div>
  )
}
