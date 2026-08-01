'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Check, QrCode } from 'lucide-react'
import { brand, fontDisplay, fontBody, fontMono } from '@/lib/brand'
import { LINEAS_REALES, ROLES, PROCESOS_PRODUCCION, EMOJI_PROCESO, CATEGORIAS_MATERIAL } from '@/lib/constants'
import { useApp, formatTime, formatDate } from '@/lib/context'
import { MallatexLogo } from '@/components/logos/MallatexLogo'
import { BigButton } from '@/components/ui/BigButton'
import { Badge } from '@/components/ui/Badge'
import { AlertTabletScreen } from './AlertTabletScreen'
import { MermaTabletScreen } from './MermaTabletScreen'

// MT-PC-003 actividades 7-23 — Tablet fija por línea con multi-operador simultáneo (ADR-004).
export function TabletLineaApp() {
  const [selectedLine, setSelectedLine] = useState(null)
  const [currentOps, setCurrentOps] = useState([])
  const [activeOpId, setActiveOpId] = useState(null)
  const [screen, setScreen] = useState('selectLine')
  const [scannedRoll, setScannedRoll] = useState(null)
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

  // ====== TABLET FRAME ======
  const TabletFrame = ({ children }) => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', background: brand.paper }}>
      <Link href="/" style={{
        alignSelf: 'flex-start', marginBottom: 14, color: brand.ink,
        display: 'flex', alignItems: 'center', gap: 8,
        ...fontMono, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase',
        background: brand.white, border: `1px solid ${brand.line}`, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700,
        textDecoration: 'none',
      }}>
        <ArrowLeft size={14} /> Cambiar perfil
      </Link>
      <div style={{
        width: '100%', maxWidth: 1100, aspectRatio: '16/10',
        background: brand.white, borderRadius: 18,
        boxShadow: '0 20px 50px -16px rgba(227,6,19,0.15)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        border: `1px solid ${brand.line}`,
      }}>{children}</div>
    </div>
  )

  // ====== HEADER común ======
  const TabletHeader = ({ showOps = true, back, title, subtitle }) => (
    <header style={{
      background: brand.white, borderBottom: `1px solid ${brand.line}`,
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
        {back ? (
          <button onClick={back} style={{
            background: brand.redLight, color: brand.red, border: `1px solid ${brand.red}`, borderRadius: 8,
            padding: '10px 14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, ...fontDisplay, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <ArrowLeft size={16} /> Atrás
          </button>
        ) : (
          <>
            <MallatexLogo size={32} />
            <div style={{ width: 1, height: 38, background: brand.line }} />
          </>
        )}
        <div style={{ minWidth: 0 }}>
          {title ? (
            <>
              <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 22, textTransform: 'uppercase', lineHeight: 1, color: brand.ink }}>{title}</div>
              <div style={{ ...fontMono, fontSize: 10, color: brand.red, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{subtitle}</div>
            </>
          ) : linea ? (
            <>
              <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', lineHeight: 1, color: brand.ink, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{linea.emoji}</span>
                {linea.nombre} <span style={{ color: brand.red, marginLeft: 4 }}>· {linea.id}</span>
              </div>
              <div style={{ ...fontMono, fontSize: 10, color: '#888', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Turno A · 06:00 — 14:00</div>
            </>
          ) : null}
        </div>
      </div>

      {/* Operadores fichados (chip por cada uno) */}
      {showOps && currentOps.length > 0 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {currentOps.map((op) => (
            <button key={op.id} onClick={() => setActiveOpId(op.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px 4px 4px', borderRadius: 30, cursor: 'pointer',
              background: activeOpId === op.id ? brand.red : brand.white,
              border: `2px solid ${activeOpId === op.id ? brand.red : brand.line}`,
              transition: 'all .15s',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: op.color, color: 'white', display: 'grid', placeItems: 'center', ...fontDisplay, fontWeight: 900, fontSize: 13 }}>{op.initial}</div>
              <span style={{ ...fontDisplay, fontWeight: 800, fontSize: 12, textTransform: 'uppercase', color: activeOpId === op.id ? 'white' : brand.ink }}>{op.name}</span>
            </button>
          ))}
          <button onClick={() => setScreen('addOp')} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: brand.redLight, color: brand.red, border: `2px solid ${brand.red}`,
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      )}

      <div style={{ textAlign: 'right', flexShrink: 0, ...fontDisplay }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: brand.ink }}>{formatTime(currentTime)}</div>
        <div style={{ ...fontMono, fontSize: 10, color: '#888', letterSpacing: '0.15em' }}>{formatDate(currentTime)}</div>
      </div>
    </header>
  )

  const StatusBar = ({ variant = 'ok', children }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px',
      background: variant === 'go' || variant === 'ok' ? brand.ok : variant === 'warn' ? brand.warn : variant === 'bad' ? brand.red : '#444',
      color: variant === 'warn' ? brand.black : 'white',
      ...fontDisplay, fontWeight: 700, fontSize: 13, letterSpacing: '0.05em', textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: variant === 'warn' ? brand.black : 'white', animation: 'pulse 1.4s infinite', flexShrink: 0 }} />
      {children}
    </div>
  )

  // ====== PANTALLA: SELECTOR DE LÍNEA ======
  if (screen === 'selectLine' || !selectedLine) {
    return (
      <TabletFrame>
        <TabletHeader showOps={false} title="¿Qué línea es esta tablet?" subtitle="Configurar tablet" />
        <div style={{ flex: 1, overflowY: 'auto', padding: 32, background: brand.paper }}>
          <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', marginBottom: 18, fontWeight: 700, textAlign: 'center' }}>
            ◆ Toca la línea correspondiente — solo se hace una vez al instalar la tablet
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, maxWidth: 900, margin: '0 auto' }}>
            {LINEAS_REALES.map((l) => (
              <button key={l.id} onClick={() => { setSelectedLine(l.id); setScreen('home') }} style={{
                background: brand.white, border: `2px solid ${brand.line}`,
                borderRadius: 14, padding: '24px 14px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                minHeight: 160, transition: 'all .2s',
              }}>
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

  // ====== PANTALLA: AGREGAR OPERADOR ======
  if (screen === 'addOp') {
    const disponibles = operadoresElegibles.filter((op) => !currentOps.find((c) => c.id === op.id))
    return (
      <TabletFrame>
        <TabletHeader showOps={false} back={() => setScreen('home')} title="¿Quién se suma al turno?" subtitle={`Línea ${selectedLine}`} />
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
                <button key={op.id} onClick={() => {
                  setCurrentOps((prev) => [...prev, op])
                  setActiveOpId(op.id)
                  setScreen('home')
                }} style={{
                  background: brand.white, border: `2px solid ${brand.line}`,
                  borderRadius: 14, padding: 16, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  position: 'relative', transition: 'all .15s', minHeight: 84,
                }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: op.color, color: 'white',
                    display: 'grid', placeItems: 'center',
                    ...fontDisplay, fontWeight: 900, fontSize: 26,
                    flexShrink: 0, border: `3px solid ${brand.white}`,
                    boxShadow: `0 0 0 2px ${op.color}`,
                  }}>{op.initial}</div>
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 18, textTransform: 'uppercase', lineHeight: 1, color: brand.ink }}>{op.name}</div>
                    <div style={{ ...fontMono, fontSize: 10, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>{op.promedioMLhr} mL/hr</div>
                  </div>
                  <div style={{
                    position: 'absolute', top: 8, right: 10,
                    background: brand.red, color: 'white',
                    fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                    letterSpacing: '0.1em',
                  }}>{op.tipo}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </TabletFrame>
    )
  }

  // ====== PANTALLA: HOME ======
  if (screen === 'home') {
    return (
      <TabletFrame>
        <TabletHeader />
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
                        <span key={p} style={{
                          ...fontDisplay, fontSize: 12, padding: '5px 10px', borderRadius: 6, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700,
                          background: p === activeOrder.procesoActual ? brand.white : 'rgba(0,0,0,0.25)',
                          color: p === activeOrder.procesoActual ? brand.red : 'white',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>{EMOJI_PROCESO[p]} {PROCESOS_PRODUCCION.find((pp) => pp.id === p)?.label}</span>
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
                <button onClick={() => setScreen('addOp')} style={{
                  width: '100%', padding: 24, marginBottom: 12, borderRadius: 14,
                  background: brand.red, color: 'white', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  ...fontDisplay, fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.04em',
                  animation: 'hint-pulse 2s infinite',
                }}>
                  <span style={{ fontSize: 32 }}>👋</span>
                  Empezar — ficha tu turno
                </button>
              ) : (
                <>
                  <BigButton emoji="➕" onClick={() => { if (activeOp) updateOrder(activeOrder.id, { hechas: activeOrder.hechas + 1 }) }}>
                    {activeOp ? `+1 pieza · ${activeOp.name}` : 'Toca un operador primero'}
                  </BigButton>
                  <BigButton variant="ghost" emoji="📷" onClick={() => setScreen('scan')}>Escanear rollo</BigButton>
                  <BigButton variant="pause" emoji="⏸️" onClick={() => setScreen('alert')}>Pausar / Reportar</BigButton>
                  <BigButton variant="red" emoji="⚠️" onClick={() => setScreen('merma')}>Reportar merma</BigButton>
                  <BigButton variant="stop" emoji="✅" onClick={() => {
                    alert('Proceso terminado.\nMT-DT-003 actualizado.\nProducción verificará pesaje.')
                    updateOrder(activeOrder.id, { estado: 'terminado' })
                  }}>Terminar orden</BigButton>
                </>
              )}
            </div>
          )}
        </div>
      </TabletFrame>
    )
  }

  // ====== PANTALLA: ESCANEAR ROLLO ======
  if (screen === 'scan') {
    const handleScan = () => {
      const roll = rolls.find((r) => r.pedido === activeOrder?.id) || rolls[0]
      setScannedRoll(roll)
    }
    return (
      <TabletFrame>
        <TabletHeader back={() => setScreen('home')} title="Escanear rollo" subtitle="MT-DT-003" />
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: brand.paper, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            {!scannedRoll ? (
              <div style={{ background: brand.white, padding: 30, borderRadius: 14, border: `2px solid ${brand.line}`, textAlign: 'center' }}>
                <div style={{ fontSize: 54, marginBottom: 8 }}>📷</div>
                <div style={{ ...fontDisplay, fontWeight: 900, fontSize: 24, textTransform: 'uppercase', marginBottom: 8, color: brand.ink }}>Apunta al QR</div>
                <div style={{ ...fontMono, fontSize: 11, color: '#666', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 18 }}>de la etiqueta del rollo</div>
                <div onClick={handleScan} style={{
                  position: 'relative', width: 220, height: 220, margin: '0 auto 18px', cursor: 'pointer',
                  background: brand.paper, border: `2px solid ${brand.red}`, borderRadius: 8,
                }}>
                  <div style={{ position: 'absolute', top: '50%', left: '5%', right: '5%', height: 2, background: brand.red, boxShadow: `0 0 16px ${brand.red}`, animation: 'scan 2s ease-in-out infinite alternate' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <QrCode size={80} color={brand.red} opacity={0.4} />
                  </div>
                </div>
                <button onClick={handleScan} style={{
                  ...fontMono, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase',
                  background: brand.red, border: 'none', padding: '12px 22px', borderRadius: 8,
                  cursor: 'pointer', color: 'white', fontWeight: 700,
                }}>Toca para simular</button>
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
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0', borderBottom: i < 5 ? `1px dashed ${brand.line}` : 'none',
                  }}>
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

  // ====== PANTALLA: ALERT ======
  if (screen === 'alert') {
    return (
      <TabletFrame>
        <TabletHeader back={() => setScreen('home')} title="¿Qué pasó?" subtitle="Avisar a producción" />
        <AlertTabletScreen onSubmit={(tipo, desc) => {
          addAviso({ linea: selectedLine, operador: activeOp?.name || 'Línea', tipo, desc })
          alert('Aviso enviado a Producción.')
          setScreen('home')
        }} />
      </TabletFrame>
    )
  }

  // ====== PANTALLA: MERMA ======
  if (screen === 'merma') {
    return (
      <TabletFrame>
        <TabletHeader back={() => setScreen('home')} title="Reportar material" subtitle="Sobrante · Defecto · Desperdicio" />
        <MermaTabletScreen order={activeOrder} onSubmit={(metros, categoria, defecto) => {
          addMerma({
            operador: activeOp?.name, linea: selectedLine, material: activeOrder?.material,
            metros, categoria, defecto, pedido: activeOrder?.id,
          })
          alert(`Registrado como ${CATEGORIAS_MATERIAL[categoria.toUpperCase()].label}.\nMT-DT-003 actualizado.`)
          setScreen('home')
        }} />
      </TabletFrame>
    )
  }

  return null
}
