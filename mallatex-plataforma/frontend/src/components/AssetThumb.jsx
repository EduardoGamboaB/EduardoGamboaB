'use client'

// ---------------------------------------------------------------------------
// Miniatura autenticada del banco de contenido de Marketing.
//
// GET /api/mkt/assets/:id/file exige Bearer, por lo que un <img src> directo
// no funciona: aquí se descarga el binario con fetch + token (API_BASE de
// lib/api) y se muestra vía URL.createObjectURL. Exporta además helpers para
// descargar el archivo (blob -> <a download>).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { API_BASE, getToken } from '@/lib/api'

/** Descarga el binario de un asset con el token de la sesión. */
export async function fetchAssetBlob(id) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/mkt/assets/${id}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`No se pudo obtener el archivo (${res.status})`)
  return res.blob()
}

/** Fuerza la descarga del archivo de un asset al equipo del usuario. */
export async function downloadAsset(id, filename = `asset-${id}`) {
  const blob = await fetchAssetBlob(id)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

/**
 * Miniatura de imagen de un asset. Si el archivo no puede obtenerse (servicio
 * apagado, sin archivo, error) muestra un placeholder neutro sin romper.
 */
export function AssetThumb({ id, alt = '', height = 120, radius = 8, style }) {
  const [src, setSrc] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let url = null
    setSrc(null)
    setFailed(false)
    if (!id) {
      setFailed(true)
      return undefined
    }
    fetchAssetBlob(id)
      .then((blob) => {
        if (!alive) return
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  const box = {
    width: '100%',
    height,
    borderRadius: radius,
    background: 'var(--line-2, #eeeef0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  }

  if (failed) {
    return (
      <div style={box} title="Vista previa no disponible">
        <ImageOff size={22} style={{ opacity: 0.35 }} />
      </div>
    )
  }
  if (!src) {
    return (
      <div style={box}>
        <div className="spinner" />
      </div>
    )
  }
  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}
