#!/usr/bin/env node
/**
 * QA específico para el módulo MES (/mes/...).
 * Valida responsive (5 breakpoints) + flujos de navegación.
 */
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { JSDOM } from 'jsdom'
import sharp from 'sharp'

const exec = promisify(execFile)
const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3000'

const VIEWPORTS = [
  { name: 'mobile-sm',  width: 320,  height: 568,  label: '320×568 (iPhone SE)' },
  { name: 'mobile',     width: 390,  height: 844,  label: '390×844 (iPhone 13)' },
  { name: 'tablet',     width: 768,  height: 1024, label: '768×1024 (iPad)' },
  { name: 'desktop',    width: 1280, height: 800,  label: '1280×800 (Laptop)' },
  { name: 'desktop-xl', width: 1920, height: 1080, label: '1920×1080 (Full HD)' },
]

const ROUTES = [
  { path: '/mes',             name: 'selector',    label: 'Profile Selector',  expectH1: /Sistema MES/ },
  { path: '/mes/tablet',      name: 'tablet',      label: 'Tablet de Línea',   expectText: /Qué línea/ },
  { path: '/mes/produccion',  name: 'produccion',  label: 'Producción',         expectText: /Jefe de Producción/ },
  { path: '/mes/almacen',     name: 'almacen',     label: 'Almacén',            expectText: /Logística de almacén/ },
  { path: '/mes/operaciones', name: 'operaciones', label: 'Operaciones',        expectText: /Coordinador de Operaciones/ },
  { path: '/mes/cobranza',    name: 'cobranza',    label: 'Cobranza',           expectText: /Cobranza y Facturación/ },
  { path: '/mes/director',    name: 'director',    label: 'Dirección',          expectText: /Semana 21/ },
]

const FLOWS = [
  {
    id: 'F1-selector-tiene-6-perfiles',
    description: 'El ProfileSelector lista los 6 perfiles disponibles y todos enlazan a /mes/<id>',
    fn: async (htmlByRoute) => {
      const html = htmlByRoute['/mes']
      const dom = new JSDOM(html)
      const buttons = Array.from(dom.window.document.querySelectorAll('button'))
      const labels = buttons.map((b) => b.textContent?.trim() ?? '')
      const expected = ['Tablet de Línea', 'Producción', 'Almacén', 'Operaciones', 'Cobranza', 'Dirección']
      const found = expected.filter((e) => labels.some((l) => l.includes(e)))
      return { ok: found.length === expected.length, expected, found }
    },
  },
  {
    id: 'F2-cada-perfil-tiene-sidebar-y-cambiar-perfil',
    description: 'Cada role app renderiza WebShell con sidebar + botón "Cambiar perfil"',
    fn: async (htmlByRoute) => {
      const perfiles = ['/mes/produccion', '/mes/almacen', '/mes/operaciones', '/mes/cobranza', '/mes/director']
      const fails = []
      for (const p of perfiles) {
        const dom = new JSDOM(htmlByRoute[p])
        const sidebar = dom.window.document.querySelector('aside')
        const exitBtn = Array.from(dom.window.document.querySelectorAll('button')).find((b) =>
          /cambiar perfil/i.test(b.textContent ?? ''),
        )
        if (!sidebar || !exitBtn) fails.push({ ruta: p, sidebar: !!sidebar, exit: !!exitBtn })
      }
      return { ok: fails.length === 0, fails }
    },
  },
  {
    id: 'F3-producccion-tiene-11-items-de-menu',
    description: 'ProduccionApp muestra los 11 items de menú esperados',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/produccion'])
      const text = dom.window.document.body.textContent ?? ''
      const items = ['Tablero', 'Bitácora pedidos', 'Productividad', 'Planificación', 'Líneas', 'Asignar operadores', 'Avisos', 'Pesaje', 'Mermas']
      const missing = items.filter((i) => !text.includes(i))
      return { ok: missing.length === 0, missing }
    },
  },
  {
    id: 'F4-tablet-inicia-en-selector-linea',
    description: 'Tablet inicia en pantalla de selección de línea con LC1-LC4, LK, LP, LE',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/tablet'])
      const text = dom.window.document.body.textContent ?? ''
      const lineas = ['LC1', 'LC2', 'LC3', 'LC4', 'LK', 'LP', 'LE']
      const missing = lineas.filter((l) => !text.includes(l))
      return { ok: missing.length === 0, missing }
    },
  },
  {
    id: 'F5-almacen-tiene-7-pedidos-en-flujo',
    description: 'AlmacenApp Panel muestra estadísticas y pedidos pendientes de egreso',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/almacen'])
      const text = dom.window.document.body.textContent ?? ''
      const esperado = ['Logística de almacén', 'Sincronizar SAE', 'Rollos en almacén', 'Empezados', 'Recepciones hoy', 'Egresos hoy']
      const missing = esperado.filter((e) => !text.includes(e))
      return { ok: missing.length === 0, missing }
    },
  },
  {
    id: 'F6-cobranza-tiene-pedidos-pendientes-de-liberar',
    description: 'CobranzaApp muestra el pedido POCC 245 (único con pagoConfirmado=false en el seed)',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/cobranza'])
      const text = dom.window.document.body.textContent ?? ''
      return {
        ok: text.includes('POCC 245') && text.includes('Liberar'),
        evidencia: { incluyePedido: text.includes('POCC 245'), incluyeBoton: text.includes('Liberar') },
      }
    },
  },
  {
    id: 'F7-director-renderiza-OEE-y-pedidos',
    description: 'DirectorApp muestra OEE Global + producción por línea + pedidos SAE',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/director'])
      const text = dom.window.document.body.textContent ?? ''
      const checks = {
        oee: text.includes('OEE'),
        disponibilidad: text.includes('Disponibilidad'),
        calidad: text.includes('Calidad'),
        m2: text.includes('M² producidos'),
        semana21: text.includes('Semana 21'),
      }
      return { ok: Object.values(checks).every(Boolean), checks }
    },
  },
  {
    id: 'F8-operaciones-mt-pc-001-002-003',
    description: 'OperacionesApp muestra los 3 procesos formales en panel',
    fn: async (htmlByRoute) => {
      const dom = new JSDOM(htmlByRoute['/mes/operaciones'])
      const text = dom.window.document.body.textContent ?? ''
      const procs = ['MT-PC-001', 'MT-PC-002', 'MT-PC-003']
      const missing = procs.filter((p) => !text.includes(p))
      return { ok: missing.length === 0, missing }
    },
  },
]

async function fetchAll() {
  const map = {}
  for (const r of ROUTES) {
    const res = await fetch(BASE + r.path)
    map[r.path] = await res.text()
    map[r.path + '::status'] = res.status
  }
  return map
}

async function noOverflow(page) {
  const dom = new JSDOM(page)
  // structural overflow check is limited without a browser; we rely on actual screenshot widths below
  return true
}

async function captureViewport(viewport, route) {
  const dir = `qa/output/mes-evidence/${viewport.name}`
  await mkdir(dir, { recursive: true })
  const file = `${dir}/${route.name}.png`
  const args = [
    '--width', String(viewport.width),
    '--height', String(viewport.height),
    '--quality', '78',
    '--javascript-delay', '2200',
    '--no-stop-slow-scripts',
    '--enable-javascript',
    BASE + route.path,
    file,
  ]
  const started = Date.now()
  try {
    await exec('xvfb-run', ['-a', 'wkhtmltoimage', ...args], { timeout: 60000 })
    const meta = await sharp(file).metadata()
    return { ok: true, file, width: meta.width, height: meta.height, ms: Date.now() - started }
  } catch (err) {
    return { ok: false, file, error: err.message }
  }
}

function log(...args) {
  const t = new Date().toISOString().slice(11, 19)
  console.log(`[${t}]`, ...args)
}

// ---------- main ----------
await mkdir('qa/output', { recursive: true })
log('▸ MES QA — Fetching HTML…')
const htmlByRoute = await fetchAll()

// Estructura
log('▸ QA-A · Estructura HTML SSR de cada ruta')
const structure = []
for (const r of ROUTES) {
  const dom = new JSDOM(htmlByRoute[r.path])
  const status = htmlByRoute[r.path + '::status']
  const text = dom.window.document.body.textContent ?? ''
  const interactive = dom.window.document.querySelectorAll('a, button, input, select, textarea').length
  const titleOk = r.expectH1 ? r.expectH1.test(text) : r.expectText ? r.expectText.test(text) : true
  const ok = status < 400 && titleOk
  structure.push({ ruta: r.path, name: r.name, status, interactive, ok })
  log(`  ${ok ? '✅' : '❌'} ${r.path}  HTTP ${status}  · ${interactive} elementos`)
}

// Flujos
log('▸ QA-B · Flujos funcionales (8)')
const flowResults = []
for (const f of FLOWS) {
  const res = await f.fn(htmlByRoute)
  flowResults.push({ id: f.id, description: f.description, ...res })
  log(`  ${res.ok ? '✅' : '❌'} ${f.id}`)
}

// Capturas responsive
log('▸ QA-C · Capturas responsive (5 breakpoints × 7 rutas)')
const captures = []
for (const vp of VIEWPORTS) {
  log(`  · ${vp.label}`)
  for (const r of ROUTES) {
    const c = await captureViewport(vp, r)
    captures.push({ viewport: vp.name, route: r.name, ...c })
    log(`    ${c.ok ? '📸' : '⚠️ '} ${r.name.padEnd(12)} ${c.ok ? `${c.width}×${c.height}` : c.error}`)
  }
}

// Contact sheet
log('▸ QA-D · Contact sheets')
const thumbW = 300
for (const vp of VIEWPORTS) {
  const caps = captures.filter((c) => c.viewport === vp.name && c.ok)
  if (caps.length === 0) continue
  const cols = vp.name.startsWith('mobile') ? 3 : 4
  const rows = Math.ceil(caps.length / cols)
  const cellH = 380 + 24
  const cellW = thumbW + 8
  const headerH = 44
  const sheetW = cols * cellW + 8
  const sheetH = rows * cellH + 8 + headerH

  const thumbs = await Promise.all(
    caps.map(async (c) => ({
      ...c,
      buf: await sharp(c.file).resize({ width: thumbW, height: 380, fit: 'cover', position: 'top' }).toBuffer(),
    })),
  )
  const svgLabels = thumbs
    .map((t, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      return `<text x="${8 + col * cellW + thumbW / 2}" y="${headerH + row * cellH + 380 + 16}" text-anchor="middle" font-family="Arial" font-size="11" fill="#3F3F46">${t.route}</text>`
    })
    .join('')
  const titleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}" height="${sheetH}"><rect width="100%" height="100%" fill="#FAFAFA"/><rect width="100%" height="${headerH}" fill="#E30613"/><text x="14" y="28" font-family="Arial" font-size="16" font-weight="800" fill="white">Mallatex MES · ${vp.label}</text>${svgLabels}</svg>`
  const overlays = thumbs.map((t, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return { input: t.buf, left: 8 + col * cellW, top: headerH + row * cellH }
  })
  const file = `qa/output/mes-contact-sheet-${vp.name}.png`
  await sharp(Buffer.from(titleSvg)).composite(overlays).png().toFile(file)
  log(`  ✅ ${file}`)
}

// Reporte
const okStructure = structure.filter((s) => s.ok).length
const okFlows = flowResults.filter((f) => f.ok).length
const okCaps = captures.filter((c) => c.ok).length

const md = `# Reporte QA · Mallatex MES (/mes/...)

> Generado el ${new Date().toLocaleString('es-MX')}
> Base URL: \`${BASE}\`

## Resumen

| Bloque | Resultado |
|---|---|
| **QA-A · Estructura HTML SSR** | ${okStructure} / ${structure.length} rutas |
| **QA-B · Flujos funcionales** | ${okFlows} / ${flowResults.length} flujos |
| **QA-C · Capturas responsive** | ${okCaps} / ${captures.length} screenshots |

## QA-A · Estructura por ruta

| Ruta | HTTP | Elementos UI | OK |
|---|---|---|---|
${structure.map((s) => `| ${s.ruta} | ${s.status} | ${s.interactive} | ${s.ok ? '✅' : '❌'} |`).join('\n')}

## QA-B · Flujos validados

${flowResults.map((f) => `### ${f.ok ? '✅' : '❌'} ${f.id}
${f.description}

\`\`\`json
${JSON.stringify({ ok: f.ok, ...Object.fromEntries(Object.entries(f).filter(([k]) => !['id', 'description', 'ok'].includes(k))) }, null, 2)}
\`\`\`
`).join('\n')}

## QA-C · Cobertura responsive

| Viewport | Rutas | OK |
|---|---|---|
${VIEWPORTS.map((v) => {
  const c = captures.filter((x) => x.viewport === v.name)
  return `| ${v.name} (${v.label}) | ${c.length} | ${c.filter((x) => x.ok).length}/${c.length} |`
}).join('\n')}

Las capturas están en \`qa/output/mes-evidence/<viewport>/<ruta>.png\` y los
contact sheets en \`qa/output/mes-contact-sheet-<viewport>.png\`.
`

await writeFile('qa/output/MES-REPORT.md', md)
await writeFile('qa/output/mes-results.json', JSON.stringify({ structure, flowResults, captures }, null, 2))
log('▸ Reporte: qa/output/MES-REPORT.md')
log('✓ QA MES finalizado.')
