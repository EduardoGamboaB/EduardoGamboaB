import { test, expect } from '@playwright/test'
import { checkAlignment } from '../lib/checks'

/**
 * QA-05 · Alineación visual.
 * Verifica que rejillas de KPIs, items del bottom-nav y filas de tablas
 * estén perfectamente alineadas (tolerancia 2 px).
 */
test.describe('QA-05 · Alineación', () => {
  test('Dashboard: 4 tarjetas KPI alineadas en desktop', async ({ page }, info) => {
    test.skip(
      info.project.name === 'mobile' || info.project.name === 'mobile-sm',
      'KPIs apilan en 2 columnas en móvil',
    )
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Las 4 KPI cards son los primeros .card dentro del primer grid
    const kpis = page.locator('main > div > div:nth-child(2) > div')
    const count = await kpis.count()
    expect(count, 'Debería haber 4 KPI cards').toBeGreaterThanOrEqual(4)

    const r = await checkAlignment(kpis, 'horizontal', 2)
    expect(r.aligned, `KPIs no alineados (desviación ${r.deviation}px)`).toBe(true)
  })

  test('Bottom-nav: 5 items alineados horizontalmente', async ({ page }, info) => {
    test.skip(
      info.project.name !== 'mobile' && info.project.name !== 'mobile-sm',
      'Bottom-nav solo en móvil',
    )
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const items = page.locator('nav.md\\:hidden a')
    expect(await items.count()).toBe(5)
    const r = await checkAlignment(items, 'horizontal', 1)
    expect(r.aligned, `Items del bottom-nav desalineados (${r.deviation}px)`).toBe(true)
  })

  test('Sidebar: items alineados verticalmente en desktop', async ({ page }, info) => {
    test.skip(
      info.project.name === 'mobile' || info.project.name === 'mobile-sm',
      'Sidebar solo en >=768px',
    )
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const items = page.locator('aside nav a')
    expect(await items.count()).toBeGreaterThanOrEqual(5)
    const r = await checkAlignment(items, 'vertical', 1)
    expect(r.aligned, `Items del sidebar desalineados (${r.deviation}px)`).toBe(true)
  })

  test('Catálogo: tarjetas en grid alineadas por filas', async ({ page }, info) => {
    test.skip(
      info.project.name === 'mobile-sm',
      'En 320px las tarjetas apilan en 1 columna',
    )
    await page.goto('/catalogo')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('main .card').nth(1).locator('xpath=ancestor::div[1]/div')
    const count = await cards.count()
    if (count >= 2) {
      // Toma las 2 primeras (deben estar en la misma fila en >=640px)
      const firstTwo = cards.first().locator('xpath=. | following-sibling::div[1]')
      const r = await checkAlignment(firstTwo, 'horizontal', 2)
      expect(r.aligned, `Tarjetas de catálogo desalineadas (${r.deviation}px)`).toBe(true)
    }
  })
})
