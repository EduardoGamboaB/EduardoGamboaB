'use client'

import Link from 'next/link'
import { ChevronRight, RotateCcw, Database } from 'lucide-react'
import { brand, fontDisplay, fontDisplayItalic, fontBody, fontMono } from '@/lib/brand'
import { MallatexMESLogo } from '@/components/logos/MallatexMESLogo'
import { MallatexLogo } from '@/components/logos/MallatexLogo'
import { ProcessTag } from '@/components/ui/ProcessTag'
import { useApp } from '@/lib/context'
import { relativeTime } from '@/lib/storage'

// PROMPT 1 §7 — cada tarjeta navega a su ruta con <Link>.
// CLAUDE.md §4 — exactamente 6 perfiles. /direccion (no /director).
const PROFILES = [
  { id: 'tablet',      href: '/tablet',      name: 'Tablet de Línea', desc: 'Tablet fija en la línea — operadores tocan piezas, escanean rollos y reportan', emoji: '📺', code: 'MT-PC-003' },
  { id: 'produccion',  href: '/produccion',  name: 'Producción',      desc: 'Jefe de producción',                                                              emoji: '🏭', code: 'MT-PC-003' },
  { id: 'almacen',     href: '/almacen',     name: 'Almacén',         desc: 'Egreso e ingreso',                                                                emoji: '📦', code: 'MT-PC-001/002' },
  { id: 'operaciones', href: '/operaciones', name: 'Operaciones',     desc: 'Coordinador general',                                                             emoji: '⚙️', code: 'MT-PC-001/002/003' },
  { id: 'cobranza',    href: '/cobranza',    name: 'Cobranza',        desc: 'Libera pedidos a producción',                                                     emoji: '💰', code: '' },
  { id: 'direccion',   href: '/direccion',   name: 'Dirección',       desc: 'KPIs ejecutivos · OEE',                                                            emoji: '📈', code: '' },
]

const VALORES = [
  { v: 'Enfoque al cliente',     d: 'Escuchamos y entendemos cada necesidad para soluciones hechas a la medida' },
  { v: 'Calidad',                d: 'Materiales de alto desempeño y procesos cuidadosos para productos confiables' },
  { v: 'Flexibilidad',           d: 'Nos adaptamos a distintos proyectos, medidas y condiciones del campo' },
  { v: 'Compromiso',             d: 'Nos involucramos con dedicación en cada proyecto para generar valor real' },
  { v: 'Responsabilidad social', d: 'Conciencia del impacto medioambiental y bienestar de colaboradores' },
]

export function ProfileSelector() {
  const { hadStoredData, lastUpdate, resetDemo, storageAvailable } = useApp()

  const handleReset = () => {
    if (window.confirm('¿Limpiar todos los datos del demo y volver al estado inicial?\n\nEsto NO se puede deshacer.')) {
      resetDemo()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: brand.paper }}>
      <nav style={{ padding: '18px 32px', background: brand.white, borderBottom: `1px solid ${brand.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <MallatexMESLogo size={42} />
        <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase' }}>Planta Zapopan · Jal.</div>
      </nav>

      {/* Banner de hidratación — solo si hay datos previos en localStorage */}
      {hadStoredData && lastUpdate && (
        <div style={{
          padding: '10px 32px', background: brand.redLight, borderBottom: `1px solid ${brand.red}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          ...fontMono, fontSize: 12, color: brand.redDark, fontWeight: 600, letterSpacing: '0.02em',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Database size={14} />
            Datos del demo guardados localmente · Última sesión: <b>{relativeTime(lastUpdate)}</b>
          </span>
          <button onClick={handleReset} style={{
            ...fontMono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'transparent', color: brand.red, border: `1px solid ${brand.red}`,
            padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      )}

      <div style={{ position: 'relative', height: 8, background: brand.red, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${brand.red} 0%, ${brand.redDark} 50%, ${brand.red} 100%)` }} />
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 32px', position: 'relative' }}>
        <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.3em', color: brand.red, marginBottom: 20, textTransform: 'uppercase', fontWeight: 600 }}>
          ◆ Demo navegable · v0.6 · UX/UI 2026
        </div>
        <h1 style={{ ...fontDisplay, fontWeight: 900, fontSize: 56, lineHeight: 0.95, letterSpacing: '-0.01em', textTransform: 'uppercase', marginBottom: 16, maxWidth: 900 }}>
          Sistema MES para las<br />
          <em style={{ ...fontDisplayItalic, color: brand.red }}>mallas a la medida</em> de Mallatex.
        </h1>
        <p style={{ ...fontBody, fontSize: 17, color: '#555', maxWidth: 680, lineHeight: 1.5, marginBottom: 32 }}>
          Implementa los procesos formales <b>MT-PC-001</b> (Ingreso), <b>MT-PC-002</b> (Egreso) y <b>MT-PC-003</b> (Producción). Alineado al Manual de Organización <b>MT-MA-001-Admon</b>. 6 perfiles, datos simulados, indicadores integrados.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 50, ...fontMono, fontSize: 11 }}>
          <ProcessTag code="MT-PC-001-2026" /> <span style={{ color: '#666' }}>Ingreso de material</span>
          <ProcessTag code="MT-PC-002-2026" /> <span style={{ color: '#666' }}>Egreso de material</span>
          <ProcessTag code="MT-PC-003-2026" /> <span style={{ color: '#666' }}>Producción</span>
        </div>

        {/* Bento grid de 6 perfiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {PROFILES.map((p, i) => (
            <Link key={p.id} href={p.href} style={{
              textAlign: 'left', background: brand.white,
              border: `1px solid ${brand.line}`,
              borderRadius: 14, padding: 24, cursor: 'pointer',
              transition: 'all .2s', position: 'relative', overflow: 'hidden',
              minHeight: 180, textDecoration: 'none', color: 'inherit',
              display: 'block',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(227,6,19,0.25)'
                e.currentTarget.style.borderColor = brand.red
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = brand.line
              }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: brand.red }} />
              <div style={{ position: 'absolute', top: 18, right: 20, ...fontMono, fontSize: 10, color: '#bbb', letterSpacing: '0.15em', fontWeight: 600 }}>0{i + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, marginTop: 6 }}>
                <span style={{ fontSize: 48, lineHeight: 1 }}>{p.emoji}</span>
                <ChevronRight size={22} style={{ color: '#ddd', marginLeft: 'auto' }} />
              </div>
              <h3 style={{ ...fontDisplay, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.01em', marginBottom: 6 }}>{p.name}</h3>
              <p style={{ ...fontBody, fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: p.code ? 12 : 0 }}>{p.desc}</p>
              {p.code && (
                <div style={{ ...fontMono, fontSize: 9, letterSpacing: '0.15em', color: brand.red, fontWeight: 600, textTransform: 'uppercase' }}>{p.code}</div>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Sección de identidad corporativa */}
      <section style={{ background: brand.white, borderTop: `1px solid ${brand.line}`, padding: '60px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
            <ProcessTag code="MT-MA-001-Admon" />
            <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', textTransform: 'uppercase', fontWeight: 600 }}>
              Marco institucional · Manual de organización
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: brand.red, marginBottom: 10, textTransform: 'uppercase', fontWeight: 700 }}>◆ Misión</div>
              <p style={{ ...fontBody, fontSize: 16, lineHeight: 1.6, color: '#1a1a1a', maxWidth: 520, margin: 0 }}>
                Diseñar y proveer mallas agrícolas <b>a la medida</b> que mejoren el rendimiento de los cultivos, mediante <b>calidad, asesoría y soluciones adaptadas</b> a cada cliente.
              </p>
            </div>
            <div>
              <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: brand.red, marginBottom: 10, textTransform: 'uppercase', fontWeight: 700 }}>◆ Visión</div>
              <p style={{ ...fontBody, fontSize: 16, lineHeight: 1.6, color: '#1a1a1a', maxWidth: 520, margin: 0 }}>
                Ser una empresa líder en <b>soluciones agrícolas personalizadas</b>, reconocida por su calidad, confiabilidad y cercanía con el productor.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <div style={{ ...fontMono, fontSize: 11, letterSpacing: '0.25em', color: brand.red, marginBottom: 14, textTransform: 'uppercase', fontWeight: 700 }}>◆ Valores organizacionales</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
              {VALORES.map((val, i) => (
                <div key={i} style={{ background: brand.paper, padding: 18, borderRadius: 8, borderTop: `3px solid ${brand.red}`, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 8, right: 12, ...fontMono, fontSize: 10, color: '#ccc', fontWeight: 700 }}>0{i + 1}</div>
                  <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 14, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.02em' }}>{val.v}</div>
                  <div style={{ ...fontBody, fontSize: 12, color: '#666', lineHeight: 1.5 }}>{val.d}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 32, borderTop: `1px solid ${brand.line}`, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Mercado objetivo</div>
              <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>Productores agrícolas</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#666', marginTop: 4 }}>Regiones Bajío, Norte y Occidente de México</div>
            </div>
            <div>
              <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Producto</div>
              <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>Malla agrícola</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#666', marginTop: 4 }}>A la medida del cliente</div>
            </div>
            <div>
              <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.25em', color: '#888', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>Razón social</div>
              <div style={{ ...fontDisplay, fontWeight: 800, fontSize: 18, textTransform: 'uppercase' }}>Tejidos Técnicos</div>
              <div style={{ ...fontBody, fontSize: 13, color: '#666', marginTop: 4 }}>Mallatex S.A. de C.V.</div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: brand.red, color: 'white', padding: '24px 32px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <MallatexLogo size={32} invert />
          <div style={{ ...fontMono, fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' }}>
            Av. El Colli #5210 · Col. Colli Urbano · C.P. 45070 · Zapopan, Jalisco
          </div>
        </div>
        {/* Reset demo · minimal · solo si el navegador soporta localStorage */}
        {storageAvailable && (
          <div style={{ maxWidth: 1280, margin: '14px auto 0', textAlign: 'right' }}>
            <button onClick={handleReset} style={{
              ...fontMono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none',
              cursor: 'pointer', padding: '4px 8px', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
              <RotateCcw size={12} /> Reset demo
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
