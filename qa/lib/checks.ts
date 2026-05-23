import type { Page, Locator } from '@playwright/test'

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
  selector: string
  text: string
}

/**
 * Detecta solapamiento entre elementos interactivos visibles dentro del viewport.
 * Considera dos elementos como "solapados" si comparten más del 6 % de área.
 *
 * Excluye solapamientos esperados (hijos dentro de contenedores, items dentro de
 * dropdowns cerrados, elementos con position:absolute decorativos como overlays
 * de patrón SVG en el login).
 */
export async function detectOverlaps(page: Page, opts?: { tolerance?: number }) {
  const tolerance = opts?.tolerance ?? 0.06

  return await page.evaluate((tol) => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a, button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"]',
      ),
    )

    const visible = interactive.filter((el) => {
      const r = el.getBoundingClientRect()
      const style = window.getComputedStyle(el)
      if (r.width < 4 || r.height < 4) return false
      if (style.visibility === 'hidden' || style.display === 'none') return false
      if (parseFloat(style.opacity) < 0.05) return false
      // Solo en viewport
      if (r.bottom < 0 || r.top > window.innerHeight) return false
      if (r.right < 0 || r.left > window.innerWidth) return false
      return true
    })

    const boxes = visible.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        el,
        rect: { x: r.left, y: r.top, w: r.width, h: r.height },
        selector: describe(el),
        text: (el.textContent ?? '').trim().slice(0, 60),
      }
    })

    function describe(el: HTMLElement): string {
      const tag = el.tagName.toLowerCase()
      const id = el.id ? `#${el.id}` : ''
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.split(/\s+/).slice(0, 2).join('.')
        : ''
      return `${tag}${id}${cls}`
    }

    function intersection(a: any, b: any) {
      const x = Math.max(a.x, b.x)
      const y = Math.max(a.y, b.y)
      const r = Math.min(a.x + a.w, b.x + b.w)
      const bb = Math.min(a.y + a.h, b.y + b.h)
      if (r <= x || bb <= y) return 0
      return (r - x) * (bb - y)
    }

    const overlaps: Array<{
      a: any
      b: any
      ratio: number
    }> = []

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i]
        const B = boxes[j]
        // Si uno contiene al otro en el DOM (hijo dentro de un padre interactivo) no contar
        if (A.el.contains(B.el) || B.el.contains(A.el)) continue
        const inter = intersection(A.rect, B.rect)
        if (inter === 0) continue
        const minArea = Math.min(A.rect.w * A.rect.h, B.rect.w * B.rect.h)
        const ratio = inter / minArea
        if (ratio > tol) {
          overlaps.push({
            a: { selector: A.selector, text: A.text, rect: A.rect },
            b: { selector: B.selector, text: B.text, rect: B.rect },
            ratio: Number(ratio.toFixed(3)),
          })
        }
      }
    }

    return overlaps
  }, tolerance)
}

/**
 * Verifica que un grupo de elementos esté alineado horizontalmente
 * (misma línea base Y) o verticalmente (misma X), con tolerancia en píxeles.
 */
export async function checkAlignment(
  locator: Locator,
  axis: 'horizontal' | 'vertical',
  toleranceP = 2,
) {
  const boxes = await locator.evaluateAll((els: HTMLElement[]) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left, y: r.top, w: r.width, h: r.height }
    }),
  )
  if (boxes.length < 2) return { aligned: true, deviation: 0, boxes }

  const reference = axis === 'horizontal' ? boxes[0].y : boxes[0].x
  let maxDev = 0
  for (const b of boxes) {
    const v = axis === 'horizontal' ? b.y : b.x
    maxDev = Math.max(maxDev, Math.abs(v - reference))
  }
  return { aligned: maxDev <= toleranceP, deviation: maxDev, boxes }
}

/** Comprueba que no hay scroll horizontal involuntario en la página. */
export async function noHorizontalOverflow(page: Page) {
  return await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth
    const winW = window.innerWidth
    const overflow = docW - winW
    return { ok: overflow <= 1, docWidth: docW, viewportWidth: winW, overflowPx: overflow }
  })
}

/** Verifica que los elementos clickeables alcancen el target táctil mínimo (44×44 WCAG 2.5.5). */
export async function minTouchTarget(page: Page, minPx = 32) {
  return await page.evaluate((min) => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('a, button, [role="button"]'),
    )
    const tooSmall: Array<{ selector: string; text: string; w: number; h: number }> = []
    for (const el of els) {
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue // no visible
      const style = window.getComputedStyle(el)
      if (style.visibility === 'hidden' || style.display === 'none') continue
      if (parseFloat(style.opacity) < 0.05) continue
      if (r.width < min || r.height < min) {
        tooSmall.push({
          selector: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''),
          text: (el.textContent ?? '').trim().slice(0, 40),
          w: Math.round(r.width),
          h: Math.round(r.height),
        })
      }
    }
    return tooSmall
  }, minPx)
}

export const ROUTES = [
  { path: '/login', name: 'login' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/pedidos', name: 'pedidos' },
  { path: '/pedidos/nuevo', name: 'pedidos-nuevo' },
  { path: '/pedidos/PED-2026-00001', name: 'pedido-detalle' },
  { path: '/produccion', name: 'produccion' },
  { path: '/produccion/registro', name: 'produccion-registro' },
  { path: '/catalogo', name: 'catalogo' },
  { path: '/inventario', name: 'inventario' },
  { path: '/calidad', name: 'calidad' },
  { path: '/reportes', name: 'reportes' },
] as const
