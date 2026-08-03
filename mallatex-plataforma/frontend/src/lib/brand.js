// ---------------------------------------------------------------------------
// Sistema de diseño UNIFICADO Mallatex — tokens de marca.
//
// Consolida la identidad corporativa (Manual de Identidad Mallatex 2023) usada
// por las cuatro apps originales (Asistencia/NOI, CRM, MES y Leads/Anaberries)
// en una sola paleta y tipografía. Cualquier cambio de color/tipografía debe
// respetar el manual de marca.
//
// Paleta oficial:
//   Rojo corporativo  #ED3237   ·  Rojo oscuro  #9B3234
//   Negro  #232121    ·  Gris   #606062        ·  Gris claro (líneas)  #D2D3D5
// ---------------------------------------------------------------------------

export const brand = {
  // Marca
  red: '#ED3237', // Rojo corporativo Mallatex (primario)
  redDark: '#9B3234', // Rojo oscuro Mallatex
  redHover: '#CF2A2F',
  redLight: '#FEF3F3',
  redSoft: '#FBDCDD',

  // Tinta / grises
  ink: '#232121', // Negro corporativo
  ink700: '#3F3D3D',
  gray: '#606062', // Gris corporativo
  gray500: '#74757A',
  gray400: '#A7A8AC',
  line: '#D2D3D5', // Gris claro corporativo (bordes)
  line2: '#EEEEF0',

  // Superficies
  bg: '#FAFAFA',
  paper: '#F5F5F6',
  white: '#FFFFFF',
  black: '#0A0A0A',

  // Semánticos
  ok: '#15803D',
  okBg: '#F0FDF4',
  warn: '#B45309',
  warnBg: '#FFFBEB',
  bad: '#B91C1C',
  badBg: '#FDECED',
  info: '#1D4ED8',
  infoBg: '#EFF6FF',
}

// Tipografías corporativas (familia Barlow) — cargadas vía Google Fonts en el
// layout raíz. Barlow Condensed para titulares/displays (feel MES), Barlow para
// cuerpo, JetBrains Mono para datos/códigos (ProcessTag MT-PC-XXX).
export const fontDisplay = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", system-ui, sans-serif',
}
export const fontBody = {
  fontFamily: '"Barlow", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}
export const fontMono = {
  fontFamily: '"JetBrains Mono", ui-monospace, "Courier New", monospace',
}

// Radios y sombras compartidos.
export const radius = 10
export const shadow = '0 1px 2px rgba(24,24,27,.04), 0 1px 3px rgba(24,24,27,.05)'
export const shadowLg = '0 10px 40px rgba(24,24,27,.14)'
