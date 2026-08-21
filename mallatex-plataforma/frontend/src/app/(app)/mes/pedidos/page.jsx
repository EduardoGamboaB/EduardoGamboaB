'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Pause, Play, GripVertical, Truck, PlayCircle, PauseCircle, Package } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { get, post } from '@/lib/api'
import { brand, fontMono } from '@/lib/brand'

// MES · Pedidos (Kanban). Tablero en vivo: las tarjetas se agrupan por estado y
// se mueven solas conforme la tablet de cada línea registra el avance (al
// completarse el pedido con sus partidas pasa a "Terminado"). Se puede arrastrar
// una tarjeta para las transiciones manuales (liberar, entregar, detener).

const POLL_MS = 3000

// Columnas del tablero: cada una agrupa uno o varios estados del pedido.
const COLUMNS = [
  { id: 'preparacion', label: 'Por liberar', color: '#b45309', estados: ['cobranza-pendiente', 'stock-faltante', 'compra-pendiente'] },
  { id: 'liberado', label: 'Liberado', color: '#2563eb', estados: ['liberado', 'material-egresado'] },
  { id: 'produccion', label: 'En producción', color: brand.red, estados: ['en-produccion'] },
  { id: 'terminado', label: 'Terminado', color: '#16a34a', estados: ['terminado'] },
  { id: 'entregado', label: 'Entregado', color: '#166534', estados: ['entregado'] },
  { id: 'detenido', label: 'Detenido', color: '#6b7280', estados: ['detenido'] },
]
const colOf = (estado) => COLUMNS.find((c) => c.estados.includes(estado))?.id || 'preparacion'

// Acción que dispara soltar una tarjeta en una columna destino.
function dropAction(order, targetColId) {
  if (order.estado === 'detenido' && targetColId !== 'detenido') return { path: 'reanudar', label: 'Reanudar' }
  if (targetColId === 'liberado' && order.estado !== 'liberado' && order.estado !== 'material-egresado') return { path: 'liberar', label: 'Liberar' }
  if (targetColId === 'entregado') return { path: 'entregar', label: 'Entregar' }
  if (targetColId === 'detenido') return { path: 'detener', label: 'Detener' }
  return null
}

function fmtDate(ts) {
  if (!ts) return null
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function Card({ order, moved, onDragStart }) {
  const subs = order.suborders || []
  const done = subs.filter((s) => s.estado === 'terminado' || s.estado === 'entregado').length
  return (
    <div
      className="kb-card"
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      style={{ borderLeft: `3px solid ${COLUMNS.find((c) => c.estados.includes(order.estado))?.color || brand.gray}`, animation: moved ? 'kbflash 2.2s ease' : 'none' }}
    >
      <div className="kb-top">
        <span style={{ ...fontMono, fontSize: 12, color: brand.red, fontWeight: 700 }}>{order.code}</span>
        <GripVertical size={14} className="muted kb-grip" />
      </div>
      <div className="kb-cli">{order.cliente || 'Sin cliente'}</div>
      {(order.material || order.medida) && <div className="kb-meta">{[order.material, order.medida].filter(Boolean).join(' · ')}</div>}

      <div className="kb-progwrap" title={`${order.terminados}/${order.meta}`}>
        <div className="kb-prog" style={{ width: `${order.progreso || 0}%` }} />
      </div>
      <div className="kb-progtxt"><b>{order.progreso || 0}%</b> · {order.terminados}/{order.meta} pzas{order.procesoActual ? ` · ${order.procesoActual}` : ''}</div>

      {subs.length > 0 && (
        <div className="kb-parts">
          <span className="kb-partlabel">Partidas {done}/{subs.length}</span>
          <div className="kb-partchips">
            {subs.slice(0, 4).map((s) => (
              <span key={s.id} className={`kb-part ${s.estado === 'terminado' || s.estado === 'entregado' ? 'ok' : ''}`}>{s.name}</span>
            ))}
            {subs.length > 4 && <span className="kb-part">+{subs.length - 4}</span>}
          </div>
        </div>
      )}
      {fmtDate(order.compromiso) && <div className="kb-compromiso">📅 Compromiso: {fmtDate(order.compromiso)}</div>}
    </div>
  )
}

export default function PedidosKanbanPage() {
  const [orders, setOrders] = useState([])
  const [at, setAt] = useState(null)
  const [error, setError] = useState(null)
  const [paused, setPaused] = useState(false)
  const [msg, setMsg] = useState(null)
  const [tick, setTick] = useState(0) // fuerza el "hace Xs"
  const prevEstados = useRef({})
  const [moved, setMoved] = useState({}) // id -> timestamp de movimiento
  const dragId = useRef(null)

  const load = useCallback(async () => {
    try {
      const data = await get('/api/mes/kanban/board')
      const list = data?.orders || []
      // Detecta cambios de columna desde el último sondeo → resalta la tarjeta.
      const nextMoved = {}
      for (const o of list) {
        const prev = prevEstados.current[o.id]
        if (prev && colOf(prev) !== colOf(o.estado)) nextMoved[o.id] = Date.now()
        prevEstados.current[o.id] = o.estado
      }
      if (Object.keys(nextMoved).length) setMoved((m) => ({ ...m, ...nextMoved }))
      setOrders(list)
      setAt(data?.at || new Date().toISOString())
      setError(null)
    } catch (e) { setError(e.message) }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (paused) return undefined
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [paused, load])
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t) }, [])

  const secsAgo = at ? Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000)) : null
  void tick

  function onDragStart(e, order) { dragId.current = order; e.dataTransfer.effectAllowed = 'move' }
  async function onDrop(e, col) {
    e.preventDefault()
    const order = dragId.current
    dragId.current = null
    if (!order) return
    if (colOf(order.estado) === col.id) return
    const action = dropAction(order, col.id)
    if (!action) { setMsg({ ok: false, text: 'Esa columna se alcanza con el avance de la tablet, no a mano.' }); return }
    // Movimiento optimista.
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, estado: col.estados[0] } : o)))
    try {
      await post(`/api/mes/kanban/${order.id}/${action.path}`, action.path === 'detener' ? { motivo: 'Detenido desde el tablero' } : {})
      setMsg({ ok: true, text: `${order.code}: ${action.label.toLowerCase()} correctamente.` })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.status === 409 ? `No se pudo ${action.label.toLowerCase()} ${order.code}: ${err.message}` : err.message })
      load()
    }
  }

  return (
    <div>
      <style>{`
        @keyframes kbflash { 0%{ background:#fff7d6 } 100%{ background:#fff } }
        .kb-board{ display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; align-items:flex-start }
        .kb-col{ flex:0 0 232px; background:var(--line-2,#f4f4f5); border-radius:12px; padding:8px; min-height:200px }
        .kb-col.over{ outline:2px dashed ${brand.red}; outline-offset:-2px }
        .kb-colhead{ display:flex; align-items:center; justify-content:space-between; padding:4px 6px 8px }
        .kb-coltitle{ font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:.3px }
        .kb-count{ background:#fff; border:1px solid var(--line,#e3e3e6); border-radius:10px; font-size:11px; font-weight:700; padding:1px 8px }
        .kb-card{ background:#fff; border:1px solid var(--line,#e3e3e6); border-radius:10px; padding:10px; margin-bottom:8px; cursor:grab; box-shadow:0 1px 2px rgba(0,0,0,.04) }
        .kb-card:active{ cursor:grabbing }
        .kb-top{ display:flex; align-items:center; justify-content:space-between }
        .kb-grip{ opacity:.4 }
        .kb-cli{ font-weight:700; font-size:13.5px; margin-top:2px }
        .kb-meta{ color:${brand.gray}; font-size:11.5px; margin-top:1px }
        .kb-progwrap{ height:7px; background:#eee; border-radius:4px; overflow:hidden; margin:8px 0 4px }
        .kb-prog{ height:100%; background:${brand.red}; border-radius:4px; transition:width .4s ease }
        .kb-progtxt{ font-size:11px; color:${brand.ink} }
        .kb-parts{ margin-top:8px; border-top:1px solid var(--line-2,#f0f0f0); padding-top:6px }
        .kb-partlabel{ font-size:10px; color:${brand.gray}; font-weight:700; text-transform:uppercase }
        .kb-partchips{ display:flex; flex-wrap:wrap; gap:4px; margin-top:4px }
        .kb-part{ font-size:10px; background:#f1f1f2; border-radius:5px; padding:1px 6px; color:${brand.ink} }
        .kb-part.ok{ background:#dcfce7; color:#166534; font-weight:700 }
        .kb-compromiso{ font-size:11px; color:${brand.gray}; margin-top:6px }
        .kb-live{ display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700 }
        .kb-dot{ width:8px; height:8px; border-radius:50%; background:#16a34a; box-shadow:0 0 0 0 rgba(22,163,74,.5); animation:kbpulse 1.6s infinite }
        @keyframes kbpulse { 0%{ box-shadow:0 0 0 0 rgba(22,163,74,.5) } 70%{ box-shadow:0 0 0 7px rgba(22,163,74,0) } 100%{ box-shadow:0 0 0 0 rgba(22,163,74,0) } }
      `}</style>

      <PageHeader title="Pedidos · Tablero Kanban" subtitle="Los pedidos se mueven de columna en vivo conforme la tablet de cada línea registra el avance de sus partidas" code="MES-KANBAN" />

      <div className="row wrap" style={{ gap: 12, alignItems: 'center', marginBottom: 14 }}>
        {paused ? (
          <span className="muted" style={{ fontSize: 12, fontWeight: 700 }}>⏸ En pausa</span>
        ) : (
          <span className="kb-live" style={{ color: '#16a34a' }}><span className="kb-dot" /> En vivo</span>
        )}
        {secsAgo != null && <span className="muted" style={{ fontSize: 12 }}>actualizado hace {secsAgo}s</span>}
        <button className="btn btn-sm" onClick={() => setPaused((p) => !p)}>{paused ? <><Play size={13} /> Reanudar</> : <><Pause size={13} /> Pausar</>}</button>
        <button className="btn btn-sm" onClick={load}><RefreshCw size={13} /> Actualizar</button>
        <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}><GripVertical size={12} style={{ verticalAlign: '-2px' }} /> Arrastra una tarjeta para liberar, entregar o detener.</span>
      </div>

      {error && <div className="alert alert-err">No se pudo cargar el tablero: {error}</div>}
      {msg && <div className={`alert ${msg.ok ? 'alert-info' : 'alert-err'}`}>{msg.text}</div>}

      <div className="kb-board">
        {COLUMNS.map((col) => {
          const cards = orders.filter((o) => colOf(o.estado) === col.id)
          return (
            <div
              key={col.id}
              className="kb-col"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('over') }}
              onDragLeave={(e) => e.currentTarget.classList.remove('over')}
              onDrop={(e) => { e.currentTarget.classList.remove('over'); onDrop(e, col) }}
            >
              <div className="kb-colhead">
                <span className="kb-coltitle" style={{ color: col.color }}>{col.label}</span>
                <span className="kb-count">{cards.length}</span>
              </div>
              {cards.map((o) => <Card key={o.id} order={o} moved={moved[o.id] && Date.now() - moved[o.id] < 2500} onDragStart={onDragStart} />)}
              {cards.length === 0 && <div className="muted" style={{ fontSize: 11, textAlign: 'center', padding: '18px 6px' }}>—</div>}
            </div>
          )
        })}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        <Package size={12} style={{ verticalAlign: '-2px' }} /> El avance real llega de las tablets de línea: al registrar piezas terminadas, el pedido avanza y —al llegar a la meta con todas sus partidas— la tarjeta salta a <b>Terminado</b> automáticamente.
      </p>
    </div>
  )
}
