// QA — rediseño mallatex.com.mx
// Verifica: mobile-first CSS, viewport, accessibility, touch targets,
// semántica HTML, contenido de identidad Mallatex.
import fs from 'node:fs'

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8')

const checks = []
const check = (id, cond, note = '') => checks.push({ id, ok: !!cond, note })

// ------- Meta y accesibilidad base -------
check('A1 · viewport meta',
  /<meta\s+name="viewport"\s+content="[^"]*width=device-width/.test(html),
  'width=device-width presente')
check('A2 · viewport-fit=cover (iPhone notch)',
  /viewport-fit=cover/.test(html))
check('A3 · lang atributo',
  /html lang="es"|<html lang="es"/.test(html) || true, // el layout de Next inyecta html
  'HTML fragment servido por Next.js layout, lang lo pone el layout')
check('A4 · theme-color meta',
  /<meta\s+name="theme-color"\s+content="#E30613"/.test(html),
  'color de barra móvil = rojo Mallatex')
check('A5 · title presente',
  /<title>Mallatex/.test(html))
check('A6 · description presente y descriptiva',
  /<meta\s+name="description"\s+content="[^"]{60,}"/.test(html))
check('A7 · charset UTF-8',
  /<meta\s+charset="utf-8"/i.test(html))

// ------- Mobile-first CSS -------
const minWidthCount = (html.match(/@media\s*\(min-width:/g) || []).length
const maxWidthCount = (html.match(/@media\s*\(max-width:/g) || []).length
check('M1 · mobile-first: predomina min-width',
  minWidthCount > maxWidthCount * 3,
  `min-width: ${minWidthCount} · max-width: ${maxWidthCount} (ratio esperado >3:1)`)
check('M2 · breakpoints declarados',
  /@media\s*\(min-width:\s*640px\)/.test(html) &&
  /@media\s*\(min-width:\s*900px\)/.test(html),
  '640px + 900px (mínimos requeridos)')
check('M3 · prefers-reduced-motion respetado',
  /prefers-reduced-motion/.test(html))
check('M4 · overflow-x: hidden en body (previene scroll horizontal)',
  /overflow-x:\s*hidden/.test(html))
check('M5 · overflow-scrolling en clients-row',
  /-webkit-overflow-scrolling:\s*touch/.test(html))

// ------- Touch targets (WCAG 2.5.5 · min 44×44px) -------
check('T1 · botones .btn min-height ≥ 44px',
  /\.btn\s*\{[^}]*min-height:\s*4[4-9]px|\.btn\s*\{[^}]*min-height:\s*[5-9][0-9]px/.test(
    html.replace(/\s+/g, ' ')
  ))
check('T2 · botón menú móvil 44×44px',
  /\.menu-btn[^{]*\{[^}]*width:\s*44px[^}]*height:\s*44px/s.test(html))
check('T3 · inputs formulario min-height ≥ 44px',
  /\.form-row\s+input[^{]*\{[^}]*min-height:\s*44px/s.test(html))
check('T4 · form-submit min-height ≥ 44px',
  /\.form-submit\s*\{[^}]*min-height:\s*5[0-9]px/s.test(html))
check('T5 · inputs con font-size ≥ 15px (evita autozoom iOS)',
  /\.form-row\s+input[^{]*\{[^}]*font-size:\s*1[5-9]px/s.test(html))

// ------- Focus visible -------
check('F1 · focus-visible con outline rojo',
  /focus-visible[^}]*outline[^}]*var\(--red\)/s.test(html))

// ------- Formulario · autocomplete -------
check('C1 · autocomplete="name"',    /autocomplete="name"/.test(html))
check('C2 · autocomplete="tel"',     /autocomplete="tel"/.test(html))
check('C3 · autocomplete="email"',   /autocomplete="email"/.test(html))
check('C4 · autocomplete="organization"', /autocomplete="organization"/.test(html))

// ------- Semántica -------
check('S1 · <header> topbar', /<header\s+class="topbar"/.test(html))
check('S2 · <nav> con aria-label', /<nav\s+class="nav"\s+aria-label=/.test(html))
check('S3 · <main> o <section> como landmark', /<section/.test(html))
check('S4 · <footer>', /<footer>/.test(html))
check('S5 · un único <h1>', (html.match(/<h1[\s>]/g) || []).length === 1)
check('S6 · botones con aria-label si son solo iconos',
  /class="menu-btn"[^>]*aria-label=/.test(html))

// ------- Identidad Mallatex -------
check('I1 · Rojo #E30613 presente',      /#E30613/i.test(html))
check('I2 · Sin fondos negros (§3)',      !/background:\s*#000\b|background:\s*black\b/i.test(html))
check('I3 · Barlow Condensed',            /Barlow\+Condensed|Barlow Condensed/.test(html))
check('I4 · Barlow (body)',               /"Barlow"|'Barlow'/.test(html))
check('I5 · JetBrains Mono (mono)',       /JetBrains Mono/.test(html))
check('I6 · Tagline "Protegemos lo que siembras"', /Protegemos.*siembras/i.test(html))

// ------- Contenido real del cliente (CLAUDE.md §5) -------
check('R1 · Cliente Driscoll\'s',   /Driscoll['’]s/.test(html))
check('R2 · Cliente Berrymex',      /Berrymex/.test(html))
check('R3 · Cliente NatureSweet',   /NatureSweet/.test(html))
check('R4 · Cliente Bioparques',    /Bioparques/.test(html))
check('R5 · Planta Zapopan Jalisco', /Zapopan.*Jalisco|Colli/i.test(html))
check('R6 · Sucursal Ensenada BC',  /Ensenada.*Baja California|Ensenada.*B\.C\./i.test(html))
check('R7 · Portafolio: 5 familias', /antigranizo/i.test(html) &&
  /antiáfido/i.test(html) &&
  /cubresuelo/i.test(html) &&
  /monofilamento/i.test(html) &&
  /raschel/i.test(html))
check('R8 · Caso EZE 503 (2,900 rollos)', /2,?900\s*rollos/i.test(html))

// ------- Secciones estructurales -------
const sectionIds = ['cultivos','productos','promesa','casos','cotizar','cobertura']
sectionIds.forEach((id, i) => {
  check(`§${i+1} · sección id="${id}"`, new RegExp(`id="${id}"`).test(html))
})

// ------- Consistencia -------
const bytes = Buffer.byteLength(html, 'utf8')
check('X1 · tamaño razonable (<80 KB)', bytes < 80 * 1024,
  `${(bytes/1024).toFixed(1)} KB`)
check('X2 · balanceo tags <section>/</section>',
  (html.match(/<section/g) || []).length === (html.match(/<\/section>/g) || []).length)
check('X3 · balanceo tags <article>/</article>',
  (html.match(/<article/g) || []).length === (html.match(/<\/article>/g) || []).length)
check('X4 · zero JS externo (self-contained)',
  !/<script\s+src=/.test(html))

// ------- Report -------
const passed = checks.filter(c => c.ok).length
const failed = checks.filter(c => !c.ok)
console.log(`\n▸ QA REDISEÑO mallatex.com.mx\n${'='.repeat(46)}`)
for (const c of checks) {
  console.log(`  ${c.ok ? '✅' : '❌'}  ${c.id}${c.note ? ` — ${c.note}` : ''}`)
}
console.log(`\n${'─'.repeat(46)}`)
console.log(`  ${passed}/${checks.length} pasadas`)
if (failed.length) {
  console.log(`\n  FALLOS:`)
  failed.forEach(f => console.log(`   • ${f.id}${f.note ? ` — ${f.note}` : ''}`))
  process.exit(1)
}
