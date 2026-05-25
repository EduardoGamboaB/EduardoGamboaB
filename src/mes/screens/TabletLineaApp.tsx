'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Check, QrCode } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/mes/lib/brand'
import { LINEAS_REALES, ROLES, PROCESOS_PRODUCCION, EMOJI_PROCESO, CATEGORIAS_MATERIAL } from '@/mes/lib/constants'
import { useApp } from '@/mes/lib/store'
import { Operator } from '@/mes/lib/seed'
import { TabletFrame } from '@/mes/components/tablet/TabletFrame'
import { TabletHeader, StatusBar } from '@/mes/components/tablet/TabletHeader'
import { AlertScreen } from '@/mes/components/tablet/AlertScreen'
import { MermaScreen } from '@/mes/components/tablet/MermaScreen'
import { BigButton } from '@/mes/components/ui/BigButton'
import { Badge } from '@/mes/components/ui/Badge'

type Screen = 'selectLine' | 'home' | 'addOp' | 'scan' | 'alert' | 'merma'

export function TabletLineaApp() {
  const router = useRouter()
  const onExit = () => router.push('/mes')

  const [selectedLine, setSelectedLine] = useState<string | null>(null)
  const [currentOps, setCurrentOps] = useState<Operator[]>([])
  const [activeOpId, setActiveOpId] = useState<number | null>(null)
  const [screen, setScreen] = useState<Screen>('selectLine')
  const [scannedRoll, setScannedRoll] = useState<any>(null)
  const { operators, orders, rolls, currentTime, updateOrder, addAviso, addMerma } = useApp()

  const linea = LINEAS_REALES.find((l) => l.id === selectedLine)
  const operadoresElegibles = useMemo(() => {
    if (!linea) return []
    return operators.filter((o) => o.role === ROLES.OPERADOR && o.maquinas.includes(linea.proceso))
  }, [linea, operators])

  const lineOrders = orders.filter(
    (o) => o.linea === selectedLine && (o.estado === 'en-produccion' || o.estado === 'material-egresado'),
  )
  const activeOrder = lineOrders[0]
  const activeOp = currentOps.find((op) => op.id === activeOpId) || currentOps[0]

  // ----- Pantalla: selector de línea
  if (screen === 'selectLine' || !selectedLine) {
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          showOps={false}
          title="¿Qué línea es esta tablet?"
          subtitle="Configurar tablet"
          currentTime={currentTime}
          currentOps={[]}
          activeOpId={null}
          onSelectOp={() => {}}
          onAddOp={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: brand.paper }}>
          <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 18, fontWeight: 700, textAlign: 'center' }}>
            ◆ Toca la línea correspondiente — solo se hace una vez al instalar la tablet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 900, margin: '0 auto' }}>
            {LINEAS_REALES.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  setSelectedLine(l.id)
                  setScreen('home')
                }}
                style={{
                  background: brand.white,
                  border: `2px solid ${brand.line}`,
                  borderRadius: 14,
                  padding: '24px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 160,
                  transition: 'all .2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = brand.red
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 8px 16px -4px rgba(227,6,19,0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = brand.line
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <span style={{ fontSize: 54, lineHeight: 1 }}>{l.emoji}</span>
                <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: brand.ink, letterSpacing: '0.02em' }}>{l.id}</div>
                <div style={{ ...fontDisplay, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: brand.red, letterSpacing: '0.05em' }}>{l.nombre}</div>
              </button>
            ))}
          </div>
        </div>
      </TabletFrame>
    )
  }

  // ----- Pantalla: agregar operador
  if (screen === 'addOp') {
    const disponibles = operadoresElegibles.filter((op) => !currentOps.find((c) => c.id === op.id))
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          showOps={false}
          back={() => setScreen('home')}
          title="¿Quién se suma al turno?"
          subtitle={`Línea ${selectedLine}`}
          currentTime={currentTime}
          currentOps={[]}
          activeOpId={null}
          onSelectOp={() => {}}
          onAddOp={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper }}>
          <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700, textAlign: 'center' }}>
            ◆ Toca tu foto para fichar — puedes ser varios en la línea
          </div>
          {disponibles.length === 0 ? (
            <div style={{ background: brand.white, padding: 32, borderRadius: 14, border: `2px solid ${brand.line}`, textAlign: 'center' }}>
              <div style={{ fontSize: 54, marginBottom: 10 }}>👍</div>
              <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>Todos ya fichados</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#666', marginTop: 6 }}>No hay más operadores con permiso para esta línea.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, maxWidth: 900, margin: '0 auto' }}>
              {disponibles.map((op) => (
                <button
                  key={op.id}
                  onClick={() => {
                    setCurrentOps((prev) => [...prev, op])
                    setActiveOpId(op.id)
                    setScreen('home')
                  }}
                  style={{
                    background: brand.white,
                    border: `2px solid ${brand.line}`,
                    borderRadius: 14,
                    padding: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    position: 'relative',
                    transition: 'all .15s',
                    minHeight: 84,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = brand.red
                    e.currentTarget.style.transform = 'scale(1.03)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = brand.line
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      background: op.color,
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      ...fontDisplay,
                      fontWeight: 900,
                      fontSize: 26,
                      flexShrink: 0,
                      border: `3px solid ${brand.white}`,
                      boxShadow: `0 0 0 2px ${op.color}`,
                    }}
                  >
                    {op.initial}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', lineHeight: 1, color: brand.ink }}>{op.name}</div>
                    <div style={{ ...fontMono, fontSize: 10, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{op.promedioMLhr} mL/hr</div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 10,
                      background: brand.red,
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 900,
                      padding: '3px 8px',
                      borderRadius: 6,
                      letterSpacing: '0.1em',
                    }}
                  >
                    {op.tipo}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </TabletFrame>
    )
  }

  // ----- Pantalla: HOME con orden activa
  if (screen === 'home') {
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          linea={linea}
          currentTime={currentTime}
          currentOps={currentOps}
          activeOpId={activeOpId}
          onSelectOp={setActiveOpId}
          onAddOp={() => setScreen('addOp')}
        />
        {activeOrder && currentOps.length > 0 && (
          <StatusBar variant="ok">
            Produciendo · {activeOrder.material} · {Math.round((activeOrder.hechas / activeOrder.meta) * 100)}% completado
          </StatusBar>
        )}
        {currentOps.length === 0 && (
          <StatusBar variant="warn">
            Nadie fichado — toca <b>+ Agregar operador</b> para comenzar
          </StatusBar>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper, display: 'grid', gridTemplateColumns: activeOrder ? '1.5fr 1fr' : '1fr', gap: 20 }}>
          <div>
            {activeOrder ? (
              <>
                <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>◆ Orden activa</div>
                <div style={{ background: brand.red, color: 'white', padding: 24, borderRadius: 14, position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: '200%', background: brand.redDark, transform: 'rotate(20deg)', opacity: 0.3 }} />
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 32, lineHeight: 1.05, textTransform: 'uppercase' }}>{activeOrder.material}</div>
                        <div style={{ ...fontMono, fontSize: 14, marginTop: 8, color: 'rgba(255,255,255,0.9)' }}>{activeOrder.medida}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Pedido SAE</div>
                        <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 22 }}>{activeOrder.id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {activeOrder.procesos.map((p) => (
                        <span
                          key={p}
                          style={{
                            ...fontDisplay,
                            fontSize: 12,
                            padding: '5px 10px',
                            borderRadius: 6,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            fontWeight: 700,
                            background: p === activeOrder.procesoActual ? brand.white : 'rgba(0,0,0,0.25)',
                            color: p === activeOrder.procesoActual ? brand.red : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {EMOJI_PROCESO[p]} {PROCESOS_PRODUCCION.find((pp) => pp.id === p)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ background: brand.white, padding: 18, borderRadius: 12, border: `2px solid ${brand.line}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
                    <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Hechas</div>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 42, lineHeight: 1, color: brand.ink }}>{activeOrder.hechas}</div>
                  </div>
                  <div style={{ background: brand.white, padding: 18, borderRadius: 12, border: `2px solid ${brand.line}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
                    <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Meta</div>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 42, lineHeight: 1, color: brand.ink }}>{activeOrder.meta}</div>
                  </div>
                  <div style={{ background: brand.red, color: 'white', padding: 18, borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📈</div>
                    <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Avance</div>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 42, lineHeight: 1 }}>{Math.round((activeOrder.hechas / activeOrder.meta) * 100)}%</div>
                  </div>
                </div>

                {activeOrder.observaciones && (
                  <div style={{ marginTop: 16, padding: 12, background: brand.redLight, border: `1px solid ${brand.red}`, borderRadius: 8, ...fontBody, fontSize: 13, color: brand.redDark }}>
                    <b>💡 Nota del pedido:</b> {activeOrder.observaciones}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>◆ Sin orden activa</div>
                <div style={{ background: brand.white, padding: 40, borderRadius: 14, border: `2px dashed ${brand.line}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 80, marginBottom: 14 }}>📋</div>
                  <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', marginBottom: 8 }}>Línea {selectedLine} libre</div>
                  <div style={{ ...fontBody, fontSize: 14, color: '#666', maxWidth: 380, margin: '0 auto' }}>Esperando que Producción asigne una orden a esta línea con material egresado.</div>
                </div>
              </>
            )}
          </div>

          {activeOrder && (
            <div>
              <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>◆ Acciones rápidas</div>
              {currentOps.length === 0 ? (
                <button
                  onClick={() => setScreen('addOp')}
                  style={{
                    width: '100%',
                    padding: 24,
                    marginBottom: 12,
                    borderRadius: 14,
                    background: brand.red,
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    ...fontDisplay,
                    fontWeight: 900,
                    fontSize: 20,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    animation: 'hint-pulse 2s infinite',
                  }}
                >
                  <span style={{ fontSize: 32 }}>👋</span>
                  Empezar — ficha tu turno
                </button>
              ) : (
                <>
                  <BigButton
                    emoji="➕"
                    onClick={() => {
                      if (activeOp) updateOrder(activeOrder.id, { hechas: activeOrder.hechas + 1 })
                    }}
                  >
                    {activeOp ? `+1 pieza · ${activeOp.name}` : 'Toca un operador primero'}
                  </BigButton>
                  <BigButton variant="ghost" emoji="📷" onClick={() => setScreen('scan')}>Escanear rollo</BigButton>
                  <BigButton variant="pause" emoji="⏸️" onClick={() => setScreen('alert')}>Pausar / Reportar</BigButton>
                  <BigButton variant="red" emoji="⚠️" onClick={() => setScreen('merma')}>Reportar merma</BigButton>
                  <BigButton
                    variant="stop"
                    emoji="✅"
                    onClick={() => {
                      alert('Proceso terminado.\nMT-DT-003 actualizado.\nProducción verificará pesaje.')
                      updateOrder(activeOrder.id, { estado: 'terminado' })
                    }}
                  >
                    Terminar orden
                  </BigButton>
                </>
              )}
            </div>
          )}
        </div>
      </TabletFrame>
    )
  }

  // ----- Pantalla: escanear rollo
  if (screen === 'scan') {
    const handleScan = () => {
      const roll = rolls.find((r) => r.pedido === activeOrder?.id) || rolls[0]
      setScannedRoll(roll)
    }
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          back={() => setScreen('home')}
          title="Escanear rollo"
          subtitle="MT-DT-003"
          currentTime={currentTime}
          currentOps={[]}
          activeOpId={null}
          onSelectOp={() => {}}
          onAddOp={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {!scannedRoll ? (
              <div style={{ background: brand.white, padding: 30, borderRadius: 14, border: `2px solid ${brand.line}`, textAlign: 'center' }}>
                <div style={{ fontSize: 54, marginBottom: 8 }}>📷</div>
                <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', marginBottom: 8, color: brand.ink }}>Apunta al QR</div>
                <div style={{ ...fontMono, fontSize: 11, color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>de la etiqueta del rollo</div>
                <div
                  onClick={handleScan}
                  style={{
                    position: 'relative',
                    width: 220,
                    height: 220,
                    margin: '0 auto 18px',
                    cursor: 'pointer',
                    background: brand.paper,
                    border: `2px solid ${brand.red}`,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: 2, background: brand.red, boxShadow: `0 0 16px ${brand.red}`, animation: 'scan 2s ease-in-out infinite alternate' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <QrCode size={80} color={brand.red} opacity={0.4} />
                  </div>
                </div>
                <button
                  onClick={handleScan}
                  style={{
                    ...fontMono,
                    fontSize: 12,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    background: brand.red,
                    border: 'none',
                    padding: '12px 22px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 700,
                  }}
                >
                  Toca para simular
                </button>
              </div>
            ) : (
              <div style={{ background: brand.white, border: `2px solid ${brand.line}`, padding: 20, borderRadius: 14, borderTop: `4px solid ${brand.red}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, marginBottom: 14, borderBottom: `2px solid ${brand.black}` }}>
                  <div style={{ width: 40, height: 40, background: brand.ok, color: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center' }}>
                    <Check size={22} strokeWidth={3} />
                  </div>
                  <h4 style={{ ...fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: brand.ink }}>Rollo leído</h4>
                  {scannedRoll.empezado && <Badge variant="warn">Empezado</Badge>}
                </div>
                {[
                  ['📦', 'Material',  scannedRoll.material],
                  ['📏', 'Medida',    scannedRoll.medida],
                  ['🏷️', 'Lote',      scannedRoll.lote],
                  ['⚖️', 'Peso',      `${scannedRoll.peso} kg`],
                  ['📍', 'Ubicación', scannedRoll.ubicacion],
                  ['📋', 'Pedido',    scannedRoll.pedido || '—'],
                ].map(([e, k, v], i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: i < 5 ? `1px dashed ${brand.line}` : 'none',
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{e}</span>
                    <span style={{ ...fontMono, fontSize: 11, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', flex: 1, fontWeight: 600 }}>{k}</span>
                    <span style={{ ...fontDisplay, fontWeight: 800, fontSize: 16, color: k === 'Pedido' && v !== '—' ? brand.red : brand.ink }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 14, fontWeight: 700 }}>◆ Acciones</div>
            {scannedRoll && (
              <>
                <BigButton variant="red" emoji="✅" onClick={() => setScreen('home')}>Usar este rollo</BigButton>
                <BigButton variant="ghost" emoji="🔄" onClick={() => setScannedRoll(null)}>Escanear otro</BigButton>
              </>
            )}
          </div>
        </div>
      </TabletFrame>
    )
  }

  // ----- Pantalla: alert
  if (screen === 'alert') {
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          back={() => setScreen('home')}
          title="¿Qué pasó?"
          subtitle="Avisar a producción"
          currentTime={currentTime}
          currentOps={[]}
          activeOpId={null}
          onSelectOp={() => {}}
          onAddOp={() => {}}
        />
        <AlertScreen
          onSubmit={(tipo, desc) => {
            addAviso({ linea: selectedLine ?? '', operador: activeOp?.name || 'Línea', tipo, desc })
            alert('Aviso enviado a Producción.')
            setScreen('home')
          }}
        />
      </TabletFrame>
    )
  }

  // ----- Pantalla: merma
  if (screen === 'merma') {
    return (
      <TabletFrame onExit={onExit}>
        <TabletHeader
          back={() => setScreen('home')}
          title="Reportar material"
          subtitle="Sobrante · Defecto · Desperdicio"
          currentTime={currentTime}
          currentOps={[]}
          activeOpId={null}
          onSelectOp={() => {}}
          onAddOp={() => {}}
        />
        <MermaScreen
          order={activeOrder}
          onSubmit={(metros, categoria, defecto) => {
            addMerma({
              operador: activeOp?.name,
              linea: selectedLine ?? '',
              material: activeOrder?.material,
              metros,
              categoria: categoria as any,
              defecto: defecto ?? '',
              pedido: activeOrder?.id,
            })
            const cat = (CATEGORIAS_MATERIAL as any)[categoria.toUpperCase()]
            alert(`Registrado como ${cat?.label ?? categoria}.\nMT-DT-003 actualizado.`)
            setScreen('home')
          }}
        />
      </TabletFrame>
    )
  }

  return null
}
