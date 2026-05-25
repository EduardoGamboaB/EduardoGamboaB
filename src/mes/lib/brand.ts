/**
 * Mallatex MES — tokens de marca (colores y tipografías).
 * Equivalente a las constantes `brand` y `font*` del prototipo v6.
 */
export const brand = {
  red: '#E30613',
  redDark: '#B30410',
  redLight: '#FFE5E7',
  black: '#0a0a0a',
  ink: '#1a1a1a',
  white: '#ffffff',
  paper: '#fafafa',
  paper2: '#f0f0f0',
  line: '#e0e0e0',
  ok: '#1e8a3c',
  warn: '#f5a623',
  bad: '#E30613',
} as const

export const fontDisplay = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
} as const
export const fontDisplayItalic = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
  fontStyle: 'italic',
} as const
export const fontBody = { fontFamily: '"Barlow", "Inter", sans-serif' } as const
export const fontMono = {
  fontFamily: '"JetBrains Mono", "Courier New", monospace',
} as const

export const LOGO_FULL_URL = '/brand/mallatex-logo.png'
export const LOGO_SYMBOL_URL = '/brand/mallatex-symbol.png'
