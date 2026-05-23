import { test, expect } from '@playwright/test'
import { ROUTES } from '../lib/checks'

/**
 * QA-04 · Navegación funcional.
 *  - Toda ruta principal carga sin error.
 *  - En desktop la sidebar permite navegar entre módulos.
 *  - En móvil la bottom-nav permite navegar entre los módulos clave.
 */
test.describe('QA-04 · Navegación', () => {
  for (const route of ROUTES) {
    test(`${route.name}: la ruta carga (HTTP 200) y renderiza un H1`, async ({ page }) => {
      const resp = await page.goto(route.path)
      expect(resp?.status(), `HTTP en ${route.path}`).toBeLessThan(400)

      // Toda página principal debe tener un H1 o un H2 (login usa H2)
      const h1 = page.locator('h1').first()
      const h2 = page.locator('h2').first()
      const h1Visible = await h1.isVisible().catch(() => false)
      const h2Visible = await h2.isVisible().catch(() => false)
      expect.soft(h1Visible || h2Visible, `Sin título en ${route.path}`).toBe(true)
    })
  }

  test('navegación cruzada: dashboard → pedidos → producción → catálogo', async ({
    page,
  }, info) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Selección de nav según breakpoint
    const isMobile = info.project.name === 'mobile' || info.project.name === 'mobile-sm'
    const navRoot = isMobile ? page.locator('nav').last() : page.locator('aside nav')

    for (const dest of ['Pedidos', 'Producción']) {
      await navRoot.getByRole('link', { name: dest }).first().click()
      await page.waitForLoadState('networkidle')
      // Tras navegar debe existir un H1 con el nombre de la página
      await expect(page.locator('h1', { hasText: dest })).toBeVisible()
    }

    // Catálogo no está en bottom-nav móvil → usar enlace solo si está visible
    if (!isMobile) {
      await navRoot.getByRole('link', { name: 'Catálogo' }).first().click()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1', { hasText: /Catálogo/ })).toBeVisible()
    }
  })

  test('CTA "Registrar producción" lleva al formulario móvil-first', async ({ page }) => {
    await page.goto('/produccion')
    await page.waitForLoadState('networkidle')
    await page.getByRole('link', { name: /Registrar producción/i }).first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1', { hasText: 'Registro de producción' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Guardar registro/i })).toBeVisible()
  })
})
