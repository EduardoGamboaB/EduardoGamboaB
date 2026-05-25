'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  initialOperators, initialOrders, initialRolls, initialAvisos, initialMermas,
  initialRecepciones, initialEgresos, initialProductosTerminados, initialProductividad,
  Order, Roll, Aviso, Merma, Recepcion, Egreso, ProductoTerminado, Productividad, Operator,
} from './seed'
import { formatTime } from './format'

interface AppContextValue {
  orders: Order[]
  rolls: Roll[]
  avisos: Aviso[]
  mermas: Merma[]
  recepciones: Recepcion[]
  egresos: Egreso[]
  productosTerminados: ProductoTerminado[]
  productividad: Productividad[]
  operators: Operator[]
  currentTime: Date
  updateOrder: (id: string, patch: Partial<Order>) => void
  updateRoll: (id: string, patch: Partial<Roll>) => void
  addAviso: (aviso: Partial<Aviso>) => void
  addMerma: (merma: Partial<Merma>) => void
  addRecepcion: (rec: Partial<Recepcion>) => void
  addEgreso: (eg: Partial<Egreso>) => void
  addProductoTerminado: (pt: Partial<ProductoTerminado>) => void
  addProductividad: (p: Partial<Productividad>) => void
  liberarPedido: (id: string) => void
}

const AppContext = createContext<AppContextValue | null>(null)
export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [rolls, setRolls] = useState<Roll[]>(initialRolls)
  const [avisos, setAvisos] = useState<Aviso[]>(initialAvisos)
  const [mermas, setMermas] = useState<Merma[]>(initialMermas)
  const [recepciones, setRecepciones] = useState<Recepcion[]>(initialRecepciones)
  const [egresos, setEgresos] = useState<Egreso[]>(initialEgresos)
  const [productosTerminados, setProductosTerminados] = useState<ProductoTerminado[]>(initialProductosTerminados)
  const [productividad, setProductividad] = useState<Productividad[]>(initialProductividad)
  const [operators] = useState<Operator[]>(initialOperators)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const updateOrder = (id: string, patch: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  const updateRoll = (id: string, patch: Partial<Roll>) =>
    setRolls((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const addAviso = (aviso: Partial<Aviso>) =>
    setAvisos((prev) => [{ id: Date.now(), hora: formatTime(new Date()), tiempo: '00:01', estado: 'urgente', linea: '', operador: '', tipo: '', desc: '', ...aviso } as Aviso, ...prev])
  const addMerma = (merma: Partial<Merma>) =>
    setMermas((prev) => [{ id: Date.now(), fecha: new Date().toISOString().slice(0, 10), operador: '', linea: '', material: '', metros: 0, categoria: 'desperdicio', defecto: '', pedido: '', ...merma } as Merma, ...prev])
  const addRecepcion = (rec: Partial<Recepcion>) =>
    setRecepciones((prev) => [{ id: `REC-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), proveedor: '', packingList: '', factura: '', rollos: 0, pesoTotal: 0, muestreoOK: true, ingresadoSAE: false, responsable: '', ...rec } as Recepcion, ...prev])
  const addEgreso = (eg: Partial<Egreso>) =>
    setEgresos((prev) => [{ id: `EGR-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), pedido: '', material: '', rollos: 0, m2: 0, empezadosUsados: 0, responsableAlmacen: '', responsableProd: '', confirmado: true, ...eg } as Egreso, ...prev])
  const addProductoTerminado = (pt: Partial<ProductoTerminado>) =>
    setProductosTerminados((prev) => [{ id: `PT-${Date.now()}`, pedido: '', material: '', medida: '', rollos: 1, pesoTeorico: 0, pesoReal: 0, fecha: '', hora: '', verificado: false, responsable: '', ...pt } as ProductoTerminado, ...prev])
  const addProductividad = (p: Partial<Productividad>) =>
    setProductividad((prev) => [{ fecha: new Date().toISOString().slice(0, 10), linea: '', operador: '', horaInicio: '', horaFinal: '', imprevistos: 0, tiempoEfectivo: 0, mLTurno: 0, piezasTurno: 0, descripcion: '', ...p } as Productividad, ...prev])
  const liberarPedido = (id: string) => updateOrder(id, { pagoConfirmado: true, estado: 'liberado' })

  return (
    <AppContext.Provider value={{
      orders, rolls, avisos, mermas, recepciones, egresos, productosTerminados, productividad, operators, currentTime,
      updateOrder, updateRoll, addAviso, addMerma, addRecepcion, addEgreso, addProductoTerminado, addProductividad, liberarPedido,
    }}>
      {children}
    </AppContext.Provider>
  )
}
