'use client'

import { useEffect, useState, useCallback } from 'react'
import { get } from './api'

/**
 * Hook de carga de datos desde el gateway con estados loading/error/data.
 * Tolerante: si el endpoint aún no existe o falla, expone el error sin romper
 * la pantalla. Devuelve { data, loading, error, reload }.
 *
 * @param {string} path      ruta /api/... (o null para no cargar)
 * @param {any}    fallback  valor inicial de data
 */
export function useData(path, fallback = null) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(!!path)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const res = await get(path)
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [path])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload, setData }
}

// Normaliza respuestas que pueden venir como arreglo o { items } / { data }.
export function asList(res) {
  if (Array.isArray(res)) return res
  if (!res) return []
  if (Array.isArray(res.items)) return res.items
  if (Array.isArray(res.data)) return res.data
  if (Array.isArray(res.rows)) return res.rows
  return []
}
