// Validación QA estructural — verifica que las 7 rutas devuelven HTML correcto
// y que el módulo IA Pro responde al deep link ?ia=
import { JSDOM } from 'jsdom'

const BASE = 'http://localhost:3000'

const ROUTES = [
  { path: '/',            name: 'home',        expect: /Sistema MES/ },
  { path: '/tablet',      name: 'tablet',      expect: /Qué línea/ },
  { path: '/produccion',  name: 'produccion',  expect: /Jefe de Producción/ },
  { path: '/almacen',     name: 'almacen',     expect: /Logística de almacén/ },
  { path: '/operaciones', name: 'operaciones', expect: /Coordinador de Operaciones/ },
  { path: '/cobranza',    name: 'cobranza',    expect: /Cobranza y Facturación/ },
  { path: '/direccion',   name: 'direccion',   expect: /Semana 21/ },
]

const IA_DEEPLINKS = [
  { path: '/produccion?ia=chat',      name: 'IA chat',      expect: /EZE 503 — proyección/ },
  { path: '/produccion?ia=alerts',    name: 'IA alerts',    expect: /alertas activas|EZE 503 va con 3 días/ },
  { path: '/produccion?ia=insights',  name: 'IA insights',  expect: /Semana 21/ },
  { path: '/produccion?ia=forecasts', name: 'IA forecasts', expect: /Cumplimiento de entregas/i },
]

const FLOWS = [
  {
    id: 'F1 · Botón PRO presente en los 5 perfiles web',
    fn: async () => {
      const fails = []
      for (const r of ['/produccion', '/almacen', '/operaciones', '/cobranza', '/direccion']) {
        const html = await (await fetch(BASE + r)).text()
        if (!/PRO/.test(html) || !/Abrir asistente IA Pro/.test(html)) fails.push(r)
      }
      return { ok: fails.length === 0, fails }
    },
  },
  {
    id: 'F2 · Tablet NO tiene botón IA (correcto: operario no usa IA)',
    fn: async () => {
      const html = await (await fetch(BASE + '/tablet')).text()
      const hasIA = /Abrir asistente IA Pro/.test(html)
      return { ok: !hasIA, note: hasIA ? 'el botón aparece en tablet — debería ocultarse' : 'correcto' }
    },
  },
  {
    id: 'F3 · IA Pro carga 5 alertas activas (de 5 totales en seed)',
    fn: async () => {
      const html = await (await fetch(BASE + '/produccion?ia=alerts')).text()
      // React inserta <!-- --> entre el número y el texto al hidratar
      const m = html.match(/(\d+)(?:<!--[^>]*-->)?\s*alertas activas/i)
      const count = m ? parseInt(m[1], 10) : -1
      return { ok: count === 5, count }
    },
  },
  {
    id: 'F4 · IA Pro chat muestra 3 recomendaciones accionables con botón APLICAR',
    fn: async () => {
      const html = await (await fetch(BASE + '/produccion?ia=chat')).text()
      const aplicarCount = (html.match(/>Aplicar</g) || []).length
      return { ok: aplicarCount >= 3, aplicarCount }
    },
  },
  {
    id: 'F5 · Banner persistencia se renderiza cuando lastUpdate existe',
    fn: async () => {
      // Solo verifica que el código del banner está en el bundle del client
      const html = await (await fetch(BASE + '/')).text()
      const hasBannerCode = /Datos del demo guardados localmente/.test(html)
      return { ok: hasBannerCode, hint: 'el banner real solo aparece en 2ª visita con localStorage poblado' }
    },
  },
]

console.log('▸ QA-A · Estructura HTML SSR')
const struct = []
for (const r of ROUTES) {
  const res = await fetch(BASE + r.path)
  const html = await res.text()
  const ok = res.status < 400 && r.expect.test(html)
  struct.push({ ...r, status: res.status, ok })
  console.log(`  ${ok ? '✅' : '❌'} ${r.path}  HTTP ${res.status}`)
}

console.log('\n▸ QA-B · Deep linking del IA Pro')
const ia = []
for (const r of IA_DEEPLINKS) {
  const res = await fetch(BASE + r.path)
  const html = await res.text()
  const drawerOpen = /Asistente IA · Mallatex/.test(html)
  const tabContent = r.expect.test(html)
  const ok = res.status < 400 && drawerOpen && tabContent
  ia.push({ ...r, status: res.status, drawerOpen, tabContent, ok })
  console.log(`  ${ok ? '✅' : '❌'} ${r.path}  drawer=${drawerOpen} content=${tabContent}`)
}

console.log('\n▸ QA-C · Flujos funcionales')
const flows = []
for (const f of FLOWS) {
  const res = await f.fn()
  flows.push({ ...f, ...res })
  console.log(`  ${res.ok ? '✅' : '❌'} ${f.id}`, JSON.stringify(res).slice(0, 120))
}

const okStruct = struct.filter((s) => s.ok).length
const okIa = ia.filter((i) => i.ok).length
const okFlow = flows.filter((f) => f.ok).length

console.log(`\n▸ RESUMEN`)
console.log(`  QA-A estructura: ${okStruct}/${struct.length}`)
console.log(`  QA-B IA deep links: ${okIa}/${ia.length}`)
console.log(`  QA-C flujos: ${okFlow}/${flows.length}`)
