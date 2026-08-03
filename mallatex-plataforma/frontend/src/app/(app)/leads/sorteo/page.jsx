'use client'

import { useState } from 'react'
import { Gift, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { ErrorState } from '@/components/ui/States'
import { useData } from '@/lib/useData'
import { post } from '@/lib/api'
import { brand, fontDisplay } from '@/lib/brand'

// Leads · Sorteo — selecciona un ganador entre los leads elegibles.
// Consume /api/raffle (GET elegibles, POST sortea).
export default function SorteoPage() {
  const { data, loading, error, reload } = useData('/api/raffle/eligible')
  // El endpoint devuelve un resumen: { total, leadsTotales, ganadores, vigente, correoActivo }
  const total = Number(data?.total ?? 0)
  const vigente = data?.vigente !== false
  const [winner, setWinner] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [msg, setMsg] = useState('')

  async function draw() {
    setSpinning(true)
    setMsg('')
    setWinner(null)
    try {
      // El sorteo es del SERVIDOR: persiste el ganador, su folio y el correo.
      const res = await post('/api/raffle/draw', {})
      setWinner(res.ganador || res.winner || res)
      reload()
    } catch (e) {
      setMsg(`No se pudo sortear: ${e.message}`)
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div>
      <PageHeader title="Sorteo" subtitle="Selección de ganador entre participantes elegibles" code="MT-LEAD-002" />
      {error && <ErrorState error={error} />}
      {msg && <div className="alert alert-info">{msg}</div>}

      <Card>
        <div className="card-body" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Gift size={44} style={{ color: brand.red, marginBottom: 12 }} />
          <p className="muted" style={{ marginBottom: 4 }}>Participantes elegibles</p>
          <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 40, color: brand.ink }}>
            {loading ? '…' : total}
          </div>
          {!loading && data && (
            <p className="muted" style={{ fontSize: 12.5 }}>
              {data.leadsTotales ?? 0} leads del evento · {data.ganadores ?? 0} ganadores previos ·
              correo {data.correoActivo ? 'activo' : 'no configurado (entrega manual del folio)'}
            </p>
          )}

          {winner && (
            <div className="card" style={{ margin: '20px auto 0', maxWidth: 420, background: brand.redLight, borderColor: brand.red }}>
              <div className="card-body">
                <div className="row" style={{ justifyContent: 'center', gap: 8, color: brand.red }}>
                  <Sparkles size={18} /> <strong>¡Ganador!</strong>
                </div>
                <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 26, marginTop: 6 }}>
                  {winner.nombre || winner.name || winner.folio}
                </div>
                <div className="mono muted" style={{ marginTop: 4 }}>
                  {winner.folio || ''} {winner.empresa ? `· ${winner.empresa}` : ''}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <button className="btn btn-primary" onClick={draw} disabled={spinning || total === 0}>
              <Sparkles size={16} /> {spinning ? 'Sorteando…' : 'Realizar sorteo'}
            </button>
          </div>
          {!loading && total === 0 && (
            <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              {vigente
                ? 'El sorteo se habilita cuando el evento activo tiene participantes elegibles (captura leads en el módulo de Captura o por el QR del evento).'
                : 'No hay un evento activo: activa uno en Leads · Eventos para poder sortear.'}
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
