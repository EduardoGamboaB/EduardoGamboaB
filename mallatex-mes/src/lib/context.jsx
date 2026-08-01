'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  initialOperators, initialOrders, initialRolls, initialAvisos, initialMermas,
  initialRecepciones, initialEgresos, initialProductosTerminados, initialProductividad,
} from './data'
import {
  initialAiConversations, initialAiAlerts, initialAiInsights, initialAiForecasts,
} from './data-ia'
import {
  loadFromStorage, saveToStorage, clearAllStorage, getStorageMeta, isStorageAvailable,
} from './storage'

const AppContext = createContext(null)
export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

export const formatTime = (d) => d.toTimeString().slice(0, 5)
export const formatDate = (d) => {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

// Slices que se persisten en localStorage.
// `operators` NO se persiste (catálogo estático), `currentTime` tampoco (se regenera).
const PERSISTED_SLICES = [
  'orders', 'rolls', 'avisos', 'mermas',
  'recepciones', 'egresos', 'productosTerminados', 'productividad',
]
const SAVE_DEBOUNCE_MS = 300

export function AppProvider({ children }) {
  // Estado: arranca con initial* (server-safe) y se rehidrata en el cliente
  // tras el primer useEffect. Patrón anti-Hydration-mismatch.
  const [orders, setOrders] = useState(initialOrders)
  const [rolls, setRolls] = useState(initialRolls)
  const [avisos, setAvisos] = useState(initialAvisos)
  const [mermas, setMermas] = useState(initialMermas)
  const [recepciones, setRecepciones] = useState(initialRecepciones)
  const [egresos, setEgresos] = useState(initialEgresos)
  const [productosTerminados, setProductosTerminados] = useState(initialProductosTerminados)
  const [productividad, setProductividad] = useState(initialProductividad)
  const [operators] = useState(initialOperators)
  const [currentTime, setCurrentTime] = useState(new Date())

  // ---- Módulo IA Pro (Fase 4) — slices del demo ----
  const [aiConversations, setAiConversations] = useState(initialAiConversations)
  const [aiAlerts, setAiAlerts] = useState(initialAiAlerts)
  const [aiInsights, setAiInsights] = useState(initialAiInsights)
  const [aiForecasts, setAiForecasts] = useState(initialAiForecasts)

  const [hydrated, setHydrated] = useState(false)
  const [hadStoredData, setHadStoredData] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  // ----- Hidratación inicial (solo cliente) -----
  useEffect(() => {
    const meta = getStorageMeta()
    if (meta?.lastUpdate) {
      setHadStoredData(true)
      setLastUpdate(meta.lastUpdate)
    }
    setOrders(loadFromStorage('orders', initialOrders))
    setRolls(loadFromStorage('rolls', initialRolls))
    setAvisos(loadFromStorage('avisos', initialAvisos))
    setMermas(loadFromStorage('mermas', initialMermas))
    setRecepciones(loadFromStorage('recepciones', initialRecepciones))
    setEgresos(loadFromStorage('egresos', initialEgresos))
    setProductosTerminados(loadFromStorage('productosTerminados', initialProductosTerminados))
    setProductividad(loadFromStorage('productividad', initialProductividad))
    setAiConversations(loadFromStorage('aiConversations', initialAiConversations))
    setAiAlerts(loadFromStorage('aiAlerts', initialAiAlerts))
    setAiInsights(loadFromStorage('aiInsights', initialAiInsights))
    setAiForecasts(loadFromStorage('aiForecasts', initialAiForecasts))
    setHydrated(true)
  }, [])

  // ----- Reloj de la tablet (no se persiste) -----
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ----- Auto-guardado con debounce 300ms (un useEffect por slice) -----
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('orders',              orders),              SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [orders, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('rolls',               rolls),               SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [rolls, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('avisos',              avisos),              SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [avisos, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('mermas',              mermas),              SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [mermas, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('recepciones',         recepciones),         SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [recepciones, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('egresos',             egresos),             SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [egresos, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('productosTerminados', productosTerminados), SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [productosTerminados, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('productividad',       productividad),       SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [productividad, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('aiConversations',     aiConversations),     SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [aiConversations, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('aiAlerts',            aiAlerts),            SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [aiAlerts, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('aiInsights',          aiInsights),          SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [aiInsights, hydrated])
  useEffect(() => { if (!hydrated) return; const t = setTimeout(() => saveToStorage('aiForecasts',         aiForecasts),         SAVE_DEBOUNCE_MS); return () => clearTimeout(t) }, [aiForecasts, hydrated])

  // ----- Mutadores -----
  const updateOrder = (id, patch) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  const updateRoll = (id, patch) =>
    setRolls((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const addAviso = (aviso) =>
    setAvisos((prev) => [{ id: Date.now(), hora: formatTime(new Date()), tiempo: '00:01', estado: 'urgente', ...aviso }, ...prev])
  const addMerma = (merma) =>
    setMermas((prev) => [{ id: Date.now(), fecha: new Date().toISOString().slice(0, 10), ...merma }, ...prev])
  const addRecepcion = (rec) =>
    setRecepciones((prev) => [{ id: `REC-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), ...rec }, ...prev])
  const addEgreso = (eg) =>
    setEgresos((prev) => [{ id: `EGR-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), ...eg }, ...prev])
  const addProductoTerminado = (pt) =>
    setProductosTerminados((prev) => [{ id: `PT-${Date.now()}`, ...pt }, ...prev])
  const addProductividad = (p) =>
    setProductividad((prev) => [{ fecha: new Date().toISOString().slice(0, 10), ...p }, ...prev])
  // Cobranza libera pedido
  const liberarPedido = (id) => updateOrder(id, { pagoConfirmado: true, estado: 'liberado' })

  // ---- IA Pro: mutadores demo ----
  const dismissAiAlert = (id) =>
    setAiAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, dismissed: true } : a)))
  const addAiMessage = (convId, msg) =>
    setAiConversations((prev) => prev.map((c) =>
      c.id === convId ? { ...c, messages: [...c.messages, { ...msg, ts: new Date().toISOString() }], updatedAt: new Date().toISOString() } : c,
    ))

  // Reset demo — limpia localStorage y recarga
  const resetDemo = () => {
    clearAllStorage()
    if (typeof window !== 'undefined') window.location.reload()
  }

  return (
    <AppContext.Provider value={{
      // datos
      orders, rolls, avisos, mermas, recepciones, egresos, productosTerminados, productividad, operators, currentTime,
      // mutadores
      updateOrder, updateRoll, addAviso, addMerma, addRecepcion, addEgreso, addProductoTerminado, addProductividad, liberarPedido,
      // persistencia
      hydrated, hadStoredData, lastUpdate, resetDemo,
      storageAvailable: typeof window === 'undefined' ? false : isStorageAvailable(),
      // IA Pro (Fase 4 demo)
      aiConversations, aiAlerts, aiInsights, aiForecasts,
      dismissAiAlert, addAiMessage,
    }}>
      {children}
    </AppContext.Provider>
  )
}
