import { test, expect } from '@playwright/test'
import { noHorizontalOverflow, minTouchTarget, ROUTES } from '../lib/checks'

/**
 * QA-02 · Diseño responsivo y adaptativo.
 *  - No debe haber scroll horizontal involuntario.
 *  - El shell debe adaptarse: en móvil/tablet pequeña aparece bottom-nav,
 *    en desktop aparece sidebar.
 *  - Captura evidencia visual de cada ruta en cada breakpoint.
 */
test.describe('QA-02 · Responsivo', () => {
  for (const route of ROUTES) {
    test(`${route.name}: sin overflow horizontal`, async ({ page }, info) => {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      const r = await noHorizontalOverflow(page)
      expect.soft(r.ok, `Overflow horizontal en ${route.name}: ${r.overflowPx}px`).toBe(true)

      // Captura evidencia
      const dir = `qa/output/evidence/${info.project.name}`
      await page.screenshot({
        path: `${dir}/${route.name}.png`,
        fullPage: true,
        animations: 'disabled',
      })
    })
  }

  test('shell: sidebar visible solo en desktop, bottom-nav solo en móvil', async ({
    page,
  }, info) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('aside')
    const bottomNav = page.locator('nav.md\\:hidden').first()

    const sidebarVisible = await sidebar.isVisible().catch(() => false)
    const bottomNavVisible = await bottomNav.isVisible().catch(() => false)

    const isMobile = info.project.name === 'mobile' || info.project.name === 'mobile-sm'

    if (isMobile) {
      expect.soft(sidebarVisible, 'Sidebar no debe verse en móvil').toBe(false)
      expect.soft(bottomNavVisible, 'Bottom nav debe verse en móvil').toBe(true)
    } else {
      // tablet/desktop usan >=768 -> sidebar visible
      expect.soft(sidebarVisible, 'Sidebar debe verse en >=768px').toBe(true)
      expect.soft(bottomNavVisible, 'Bottom nav debe ocultarse en >=768px').toBe(false)
    }
  })
})

test.describe('QA-03 · Target táctil mínimo (móvil)', () => {
  test('los botones del bottom-nav cumplen 32px mínimo', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile' && info.project.name !== 'mobile-sm')
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const tooSmall = await minTouchTarget(page, 32)
    // Solo reportamos los del bottom nav (los icon-buttons del header tienen padding)
    const inBottomNav = tooSmall.filter((t) =>
      t.text.match(/Dashboard|Pedidos|Producción|Inventario|Reportes/i),
    )
    expect(inBottomNav, 'Botones del bottom-nav demasiado pequeños').toEqual([])
  })
})
