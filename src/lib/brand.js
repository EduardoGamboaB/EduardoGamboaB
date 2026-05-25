// Mallatex MES — tokens de marca (colores, tipografías, URLs de logo).
// Cualquier cambio aquí necesita aprobación expresa del usuario (CLAUDE.md §3).

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
}

export const fontDisplay = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
}
export const fontDisplayItalic = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
  fontStyle: 'italic',
}
export const fontBody = { fontFamily: '"Barlow", "Inter", sans-serif' }
export const fontMono = {
  fontFamily: '"JetBrains Mono", "Courier New", monospace',
}

// Logos PNG en public/logos/ (NO modificar, son los oficiales)
export const LOGO_FULL_URL = '/logos/mallatex-full.png'
export const LOGO_SYMBOL_URL = '/logos/mallatex-symbol.png'
