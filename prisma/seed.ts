/**
 * Seed Mallatex (v2) — datos reales de planta.
 *
 * Fuentes: tablero de líneas, etiquetas físicas de rollos, fichas de catálogo
 * en almacén, formatos MT-DT-003/004/005/006 y Pedido de Almacén.
 */
import { PrismaClient, FamiliaProducto, UnidadMedida, Rol, TipoOperacion, TipoInsumoAux } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed Mallatex v2…')

  const pwd = await bcrypt.hash('mallatex2026', 10)

  // --- Usuarios reales de la planta
  const usuarios = [
    { email: 'admin@mallatex.mx',          nombre: 'Administrador Mallatex', rol: Rol.ADMIN },
    { email: 'gerencia@mallatex.mx',       nombre: 'Gerencia',               rol: Rol.GERENCIA },
    { email: 'jefe@mallatex.mx',           nombre: 'Jefe de Producción',     rol: Rol.JEFE_PRODUCCION },
    { email: 'victor.esteban@mallatex.mx', nombre: 'Víctor Esteban',         rol: Rol.COMERCIAL },
    { email: 'carlos.aguilera@mallatex.mx', nombre: 'Carlos Aguilera',       rol: Rol.ALMACENISTA },
    { email: 'alberto.olivares@mallatex.mx', nombre: 'Alberto Olivares',     rol: Rol.ALMACENISTA },
    { email: 'nestor@mallatex.mx',         nombre: 'Néstor Hernández',       rol: Rol.MONTACARGUISTA },
    { email: 'erik@mallatex.mx',           nombre: 'Erik',                   rol: Rol.OPERARIO },
    { email: 'laura@mallatex.mx',          nombre: 'Laura',                  rol: Rol.OPERARIO },
    { email: 'gerardo@mallatex.mx',        nombre: 'Don Gera',               rol: Rol.OPERARIO },
    { email: 'carmen@mallatex.mx',         nombre: 'Carmen',                 rol: Rol.OPERARIO },
    { email: 'pao@mallatex.mx',            nombre: 'Pao',                    rol: Rol.OPERARIO },
    { email: 'eva@mallatex.mx',            nombre: 'Eva',                    rol: Rol.OPERARIO },
    { email: 'pedro@mallatex.mx',          nombre: 'Pedro',                  rol: Rol.OPERARIO },
    { email: 'lorena@mallatex.mx',         nombre: 'Lorena',                 rol: Rol.OPERARIO },
    { email: 'fatima@mallatex.mx',         nombre: 'Fátima',                 rol: Rol.OPERARIO },
    { email: 'karen@mallatex.mx',          nombre: 'Karen',                  rol: Rol.OPERARIO },
    { email: 'jesus@mallatex.mx',          nombre: 'Jesús',                  rol: Rol.OPERARIO },
    { email: 'nayeli@mallatex.mx',         nombre: 'Nayeli',                 rol: Rol.OPERARIO },
    { email: 'ana.qc@mallatex.mx',         nombre: 'Ana QC',                 rol: Rol.CALIDAD },
  ]
  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: pwd },
    })
  }

  // --- Líneas de producción reales (tablero Mallatex)
  const lineas = [
    { codigo: 'LC1', nombre: 'Línea Costura 1',  ops: ['CONFECCION', 'BASTILLAR', 'EMBOBINAR'], cap: 80 },
    { codigo: 'LC2', nombre: 'Línea Costura 2',  ops: ['CONFECCION', 'BASTILLAR', 'EMBOBINAR'], cap: 80 },
    { codigo: 'LC3', nombre: 'Línea Costura 3',  ops: ['CONFECCION', 'BASTILLAR'],              cap: 70 },
    { codigo: 'LK',  nombre: 'Línea Corte',      ops: ['CORTE', 'BAJADA_COLILLOS', 'BAJADA_ROLLOS'], cap: 350 },
    { codigo: 'LP',  nombre: 'Línea Perforadora', ops: ['PERFORAR', 'PLANCHAR'],                cap: 220 },
  ]
  for (const l of lineas) {
    await prisma.lineaProduccion.upsert({
      where: { codigo: l.codigo },
      update: {},
      create: {
        codigo: l.codigo,
        nombre: l.nombre,
        operacionesSoportadas: JSON.stringify(l.ops),
        capacidadHora: l.cap,
      },
    })
  }

  // --- Operaciones (catálogo)
  const operaciones = [
    { codigo: 'OP-EMBOB', nombre: 'Embobinar',          tipo: TipoOperacion.EMBOBINAR },
    { codigo: 'OP-PLAN',  nombre: 'Planchar',           tipo: TipoOperacion.PLANCHAR },
    { codigo: 'OP-CONF',  nombre: 'Confección',         tipo: TipoOperacion.CONFECCION },
    { codigo: 'OP-CONFD', nombre: 'Confeccionada',      tipo: TipoOperacion.CONFECCIONADA },
    { codigo: 'OP-AZOR',  nombre: 'Azorrillado',        tipo: TipoOperacion.AZORRILLADO },
    { codigo: 'OP-PERF',  nombre: 'Perforar',           tipo: TipoOperacion.PERFORAR },
    { codigo: 'OP-COR',   nombre: 'Corte',              tipo: TipoOperacion.CORTE },
    { codigo: 'OP-BAS',   nombre: 'Bastillar',          tipo: TipoOperacion.BASTILLAR },
    { codigo: 'OP-BAJC',  nombre: 'Bajada en colillos', tipo: TipoOperacion.BAJADA_COLILLOS },
    { codigo: 'OP-BAJR',  nombre: 'Bajada en rollos',   tipo: TipoOperacion.BAJADA_ROLLOS },
    { codigo: 'OP-ETI',   nombre: 'Etiquetado',         tipo: TipoOperacion.ETIQUETADO },
    { codigo: 'OP-EMP',   nombre: 'Empaque',            tipo: TipoOperacion.EMPAQUE },
  ]
  for (const o of operaciones) {
    await prisma.operacion.upsert({
      where: { codigo: o.codigo },
      update: {},
      create: o,
    })
  }

  // --- Catálogo real Mallatex (basado en fichas de almacén + etiquetas)
  const productos = [
    // Cubresuelo
    { sku: 'CUNEGRO105GR',           nombre: 'Cubresuelo Negro 105 GR',                 familia: FamiliaProducto.CUBRESUELO_NEGRO,        ancho: 7.70, largo: 100,  gramaje: 105, color: 'negro', unidad: UnidadMedida.METRO_CUADRADO, precio: 13.5 },
    { sku: 'CUNEGRO105LV',           nombre: 'Cubresuelo Negro Línea Verde 105 GR',     familia: FamiliaProducto.CUBRESUELO_LINEA_VERDE,  ancho: 0.78, largo: 237,  gramaje: 105, color: 'negro', colorSec: 'verde', unidad: UnidadMedida.METRO_CUADRADO, precio: 14.8 },
    { sku: 'CUAZORR105P70',          nombre: 'Cubresuelo Azorrillado 105 GR perforado 70cm', familia: FamiliaProducto.CUBRESUELO_AZORRILLADO, ancho: 1.80, largo: 500,  gramaje: 105, color: 'negro', carac: 'Perforados cada 70 cm', unidad: UnidadMedida.METRO_CUADRADO, precio: 16.2 },

    // Antiáfido
    { sku: 'ANTIAFIDO10X16CRISTAL',  nombre: 'Antiáfido 10×16 cristal',                 familia: FamiliaProducto.ANTIAFIDO, ancho: 0.65, largo: 120, densidad: '10x16', color: 'cristal',  precio: 42 },
    { sku: 'ANTIAFIDO10X20BICOLOR',  nombre: 'Antiáfido 10×20 bicolor',                 familia: FamiliaProducto.ANTIAFIDO, ancho: 3.70, largo: 15,  densidad: '10x20', color: 'bicolor',  precio: 44 },
    { sku: 'ANTIAFIDO10X20CRISTAL289', nombre: 'Antiáfido 10×20 cristal 1×289',         familia: FamiliaProducto.ANTIAFIDO, ancho: 1.00, largo: 289, densidad: '10x20', color: 'cristal',  precio: 45 },
    { sku: 'ANTIAFIDO12X22CRISTAL',  nombre: 'Antiáfido 12×22 cristal',                 familia: FamiliaProducto.ANTIAFIDO, ancho: 5.20, largo: 6,   densidad: '12x22', color: 'cristal',  precio: 50 },
    { sku: 'ANTIAFIDO13X31CRISTAL128',nombre: 'Antiáfido 13×31 cristal 1×128',          familia: FamiliaProducto.ANTIAFIDO, ancho: 1.00, largo: 128, densidad: '13x31', color: 'cristal',  precio: 56 },
    { sku: 'ANTIAFIDO13X31CRISTAL11', nombre: 'Antiáfido 13×31 cristal 2.70×11',        familia: FamiliaProducto.ANTIAFIDO, ancho: 2.70, largo: 11,  densidad: '13x31', color: 'cristal',  precio: 58 },
    { sku: 'ANTIAFIDO13X31BICOLOR',  nombre: 'Antiáfido 13×31 bicolor',                 familia: FamiliaProducto.ANTIAFIDO, ancho: 3.50, largo: 11,  densidad: '13x31', color: 'bicolor',  precio: 58 },

    // Antigranizo
    { sku: 'ANTIGRANIZONEGRA',       nombre: 'Antigranizo negra',                       familia: FamiliaProducto.ANTIGRANIZO, ancho: 2.08, largo: 46.5, color: 'negro',   precio: 34 },
    { sku: 'ANTIGRANIZOBLANCA',      nombre: 'Antigranizo blanca',                      familia: FamiliaProducto.ANTIGRANIZO, ancho: 3.70, largo: 8,    color: 'blanco',  precio: 30 },
    { sku: 'ANTIGRANIZOCRISTAL',     nombre: 'Antigranizo cristal',                     familia: FamiliaProducto.ANTIGRANIZO, ancho: 0.90, largo: 29.5, color: 'cristal', precio: 32 },
    { sku: 'ANTIGRANIZOESPCONF',     nombre: 'Antigranizo especial confeccionada',      familia: FamiliaProducto.ANTIGRANIZO, color: 'negro', carac: 'Confeccionada a medida', precio: 48 },

    // Manta térmica
    { sku: 'MANTATERM160NEG',        nombre: 'Manta térmica negra 1.60',                familia: FamiliaProducto.MANTA_TERMICA, ancho: 1.60, color: 'negro',  precio: 11 },
    { sku: 'MANTATERM110BLA',        nombre: 'Manta térmica blanca 1.10',               familia: FamiliaProducto.MANTA_TERMICA, ancho: 1.10, color: 'blanco', precio: 10 },

    // Monofilamento
    { sku: 'MONOFIL40BLA37X145',     nombre: 'Monofilamento 40% blanca 3.70×14.5',      familia: FamiliaProducto.MONOFILAMENTO, ancho: 3.70, largo: 14.5, color: 'blanco', porcentaje: 40, precio: 38 },

    // Pantalla térmica
    { sku: 'PANTERM180X18',          nombre: 'Pantalla térmica plastificada 1 cara 1.80×18', familia: FamiliaProducto.PANTALLA_TERMICA, ancho: 1.80, largo: 18, color: 'blanco', carac: 'Plastificada 1 cara', precio: 65 },
    { sku: 'PANTERM4X10',            nombre: 'Pantalla térmica plastificada 1 cara 4×10',     familia: FamiliaProducto.PANTALLA_TERMICA, ancho: 4.00, largo: 10, color: 'blanco', carac: 'Plastificada 1 cara', precio: 78 },

    // Raschel
    { sku: 'RASCHEL35BLANCA',        nombre: 'Malla Raschel 35% blanca',                familia: FamiliaProducto.RASCHEL, ancho: 4.10, largo: 74,  color: 'blanco', porcentaje: 35, precio: 28 },
    { sku: 'RASCHELNEGRA90',         nombre: 'Raschel negra 0.90×100',                  familia: FamiliaProducto.RASCHEL, ancho: 0.90, largo: 100, color: 'negro',  precio: 22 },

    // Otros
    { sku: 'ESPALDERACUADCHN',       nombre: 'Espaldera cuadro chico negra',            familia: FamiliaProducto.ESPALDERA, ancho: 1.05, color: 'negro', precio: 18 },
    { sku: 'EXTRUIDAVERDE',          nombre: 'Extruida verde',                          familia: FamiliaProducto.EXTRUIDA, color: 'verde', precio: 15 },
    { sku: 'GALLINERAVERDE4',        nombre: 'Malla gallinera verde 4×213.5',           familia: FamiliaProducto.MALLA_GALLINERA, ancho: 4.00, largo: 213.5, color: 'verde', precio: 19 },
    { sku: 'SOGANEGRA',              nombre: 'Soga negra',                              familia: FamiliaProducto.SOGA, color: 'negro', precio: 6 },
  ]

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nombre: p.nombre,
        familia: p.familia,
        unidad: (p as any).unidad ?? UnidadMedida.METRO_LINEAL,
        anchoMetros: (p as any).ancho,
        largoEstandar: (p as any).largo,
        gramaje: (p as any).gramaje,
        porcentajeCobertura: (p as any).porcentaje,
        densidadHilos: (p as any).densidad,
        color: (p as any).color,
        colorSecundario: (p as any).colorSec,
        caracteristicas: (p as any).carac,
        precioBase: p.precio,
      },
    })
  }

  // --- Clientes reales con prefijos
  const clientes = [
    { rfc: 'VFG980515ABC', razonSocial: 'Viveros Forestales García y Cía. (VFGC)', prefijoFolio: 'VFGC', contacto: 'Ing. Roberto García', ciudad: 'Guadalajara', estado: 'Jalisco' },
    { rfc: 'VEG150302XYZ', razonSocial: 'Viveros El Granjero S.P.R.',              prefijoFolio: 'VEG',  contacto: 'Sr. Mauricio López', ciudad: 'Zapopan',     estado: 'Jalisco' },
    { rfc: 'EZE200810QRS', razonSocial: 'Eze Agrícola del Pacífico',               prefijoFolio: 'EZE',  contacto: 'Sra. Patricia Núñez', ciudad: 'Culiacán', estado: 'Sinaloa' },
    { rfc: 'PFE210701PFE', razonSocial: 'Productores Felices',                     prefijoFolio: 'P.FEL', contacto: 'Lic. Andrés Vega',  ciudad: 'Zamora',    estado: 'Michoacán' },
    { rfc: 'GEN100100GEN', razonSocial: 'Cliente Genérico (sin prefijo)',          prefijoFolio: null,   contacto: 'Mostrador',          ciudad: 'Zapopan',   estado: 'Jalisco' },
  ]
  for (const c of clientes) {
    await prisma.cliente.upsert({
      where: { rfc: c.rfc },
      update: {},
      create: c,
    })
  }

  // --- Materias primas + lotes reales
  const materias = [
    { codigo: 'MP-HDPE-V', nombre: 'HDPE virgen',           stockMinimo: 2000 },
    { codigo: 'MP-PP-V',   nombre: 'Polipropileno virgen',  stockMinimo: 1500 },
    { codigo: 'MP-UV',     nombre: 'Aditivo UV',            stockMinimo: 200 },
    { codigo: 'MP-MB-N',   nombre: 'Masterbatch negro',     stockMinimo: 300 },
    { codigo: 'MP-MB-V',   nombre: 'Masterbatch verde',     stockMinimo: 150 },
    { codigo: 'MP-MB-B',   nombre: 'Masterbatch blanco',    stockMinimo: 150 },
  ]
  for (const m of materias) {
    await prisma.materiaPrima.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: { ...m, unidad: UnidadMedida.KILOGRAMO },
    })
  }
  const hdpe = await prisma.materiaPrima.findUnique({ where: { codigo: 'MP-HDPE-V' } })
  if (hdpe) {
    for (const c of ['6619', '4153', '4368', '2731', '39180', '3049']) {
      await prisma.loteMP.upsert({
        where: { codigo: c },
        update: {},
        create: { codigo: c, materiaPrimaId: hdpe.id, cantidadOriginal: 1500, cantidadDisponible: 600 },
      })
    }
  }

  // --- Almacenes
  for (const a of [
    { codigo: 'ALM-MP', nombre: 'Almacén materia prima',     tipo: 'MATERIA_PRIMA' },
    { codigo: 'ALM-PP', nombre: 'Almacén producto en proceso', tipo: 'PRODUCTO_PROCESO' },
    { codigo: 'ALM-PT', nombre: 'Almacén producto terminado', tipo: 'PRODUCTO_TERMINADO' },
  ]) {
    await prisma.almacen.upsert({ where: { codigo: a.codigo }, update: {}, create: a })
  }

  // --- Insumos auxiliares
  for (const i of [
    { codigo: 'INS-CINTA-T', nombre: 'Cinta transparente',  tipo: TipoInsumoAux.CINTA_TRANSPARENTE, unidad: UnidadMedida.PIEZA, stockMinimo: 20 },
    { codigo: 'INS-CINTA-M', nombre: 'Cinta Mallatex',      tipo: TipoInsumoAux.CINTA_MALLATEX,     unidad: UnidadMedida.PIEZA, stockMinimo: 30 },
    { codigo: 'INS-HILO',    nombre: 'Hilo',                tipo: TipoInsumoAux.HILO,               unidad: UnidadMedida.PIEZA, stockMinimo: 50 },
    { codigo: 'INS-AGOVER',  nombre: 'Agujas Over',         tipo: TipoInsumoAux.AGUJAS_OVER,        unidad: UnidadMedida.PIEZA, stockMinimo: 40 },
    { codigo: 'INS-AGRECTA', nombre: 'Agujas Recta',        tipo: TipoInsumoAux.AGUJAS_RECTA,       unidad: UnidadMedida.PIEZA, stockMinimo: 40 },
  ]) {
    await prisma.insumoAuxiliar.upsert({ where: { codigo: i.codigo }, update: {}, create: i })
  }

  // --- Activos (montacargas)
  for (const a of [
    { numeroEco: 'M-01', modelo: 'Yale GLP050VX', serie: 'A916V12345', tipo: 'montacargas' },
    { numeroEco: 'M-02', modelo: 'Toyota 8FGCU25', serie: 'TY78H45678', tipo: 'montacargas' },
  ]) {
    await prisma.activo.upsert({ where: { numeroEco: a.numeroEco }, update: {}, create: a })
  }

  console.log('✅ Seed v2 completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
