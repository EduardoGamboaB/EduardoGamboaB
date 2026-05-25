'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import {
  initialOperators, initialOrders, initialRolls, initialAvisos, initialMermas,
  initialRecepciones, initialEgresos, initialProductosTerminados, initialProductividad,
} from './data'

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

export function AppProvider({ children }) {
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

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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

  return (
    <AppContext.Provider value={{
      orders, rolls, avisos, mermas, recepciones, egresos, productosTerminados, productividad, operators, currentTime,
      updateOrder, updateRoll, addAviso, addMerma, addRecepcion, addEgreso, addProductoTerminado, addProductividad, liberarPedido,
    }}>
      {children}
    </AppContext.Provider>
  )
}
