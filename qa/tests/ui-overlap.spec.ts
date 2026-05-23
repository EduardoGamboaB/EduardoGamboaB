import { test, expect } from '@playwright/test'
import { detectOverlaps, ROUTES } from '../lib/checks'

/**
 * QA-01 · Solapamiento de elementos interactivos.
 * Recorre cada ruta y comprueba que ningún botón/enlace/input se monta
 * encima de otro de forma significativa (>6 % del área del menor).
 */
test.describe('QA-01 · No overlap', () => {
  for (const route of ROUTES) {
    test(`${route.name}: sin solapamientos`, async ({ page }) => {
      await page.goto(route.path)
      // Esperar carga estable
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      const overlaps = await detectOverlaps(page, { tolerance: 0.06 })

      if (overlaps.length > 0) {
        console.log(
          `❌ ${route.name} (${test.info().project.name}) — ${overlaps.length} solapamiento(s):`,
        )
        for (const o of overlaps.slice(0, 5)) {
          console.log(
            `   · "${o.a.text}" [${o.a.selector}] ⇿ "${o.b.text}" [${o.b.selector}] · ratio=${o.ratio}`,
          )
        }
      }

      expect(overlaps, `Solapamientos detectados en ${route.name}`).toEqual([])
    })
  }
})
