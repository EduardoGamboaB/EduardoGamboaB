/**
 * Seed Mallatex — datos demo para arrancar la suite con productos reales
 * del catálogo de agrotextiles para agricultura protegida.
 */
import { PrismaClient, FamiliaProducto, UnidadMedida, Rol } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed Mallatex...')

  // --- Usuarios demo
  const pwd = await bcrypt.hash('mallatex2026', 10)
  await prisma.usuario.upsert({
    where: { email: 'admin@mallatex.mx' },
    update: {},
    create: {
      email: 'admin@mallatex.mx',
      nombre: 'Administrador Mallatex',
      passwordHash: pwd,
      rol: Rol.ADMIN,
    },
  })
  await prisma.usuario.upsert({
    where: { email: 'supervisor@mallatex.mx' },
    update: {},
    create: {
      email: 'supervisor@mallatex.mx',
      nombre: 'Carlos Supervisor',
      passwordHash: pwd,
      rol: Rol.SUPERVISOR,
    },
  })
  const operario = await prisma.usuario.upsert({
    where: { email: 'operario@mallatex.mx' },
    update: {},
    create: {
      email: 'operario@mallatex.mx',
      nombre: 'María Operaria',
      passwordHash: pwd,
      rol: Rol.OPERARIO,
    },
  })

  // --- Catálogo de productos Mallatex
  const productos = [
    {
      sku: 'MS-50-N-420',
      nombre: 'Malla sombra 50% negra 4.20m',
      familia: FamiliaProducto.MALLA_SOMBRA,
      descripcion: 'Malla raschel monofilamento HDPE con protección UV. 50% de sombreo.',
      especificaciones: JSON.stringify({
        anchoMetros: 4.2,
        gramaje: 80,
        porcentajeSombra: 50,
        color: 'negro',
        uvProtegido: true,
        vidaUtilAnios: 5,
      }),
      precioBase: 18.5,
    },
    {
      sku: 'MS-70-V-420',
      nombre: 'Malla sombra 70% verde 4.20m',
      familia: FamiliaProducto.MALLA_SOMBRA,
      especificaciones: JSON.stringify({
        anchoMetros: 4.2,
        gramaje: 110,
        porcentajeSombra: 70,
        color: 'verde',
        uvProtegido: true,
      }),
      precioBase: 24.0,
    },
    {
      sku: 'MA-50x25-B-300',
      nombre: 'Malla antiáfidos 50x25 hilo blanco 3.00m',
      familia: FamiliaProducto.MALLA_ANTIAFIDOS,
      descripcion: 'Malla antiinsectos para barreras físicas en invernadero. Detiene mosca blanca, trips y áfidos.',
      especificaciones: JSON.stringify({
        anchoMetros: 3.0,
        hilosCm: '50x25',
        color: 'cristal',
        gramaje: 78,
        material: 'HDPE',
        uvProtegido: true,
      }),
      precioBase: 42.0,
    },
    {
      sku: 'CS-100-N-420',
      nombre: 'Cubre suelos 100 g/m² negro 4.20m',
      familia: FamiliaProducto.CUBRE_SUELOS,
      descripcion: 'Ground cover tejido para control de malezas, drenaje y reflexión solar.',
      unidad: UnidadMedida.METRO_CUADRADO,
      especificaciones: JSON.stringify({
        anchoMetros: 4.2,
        gramaje: 100,
        color: 'negro',
        permeable: true,
        uvProtegido: true,
      }),
      precioBase: 12.5,
    },
    {
      sku: 'MAG-12-C-700',
      nombre: 'Malla antigranizo 12g cristal 7.00m',
      familia: FamiliaProducto.MALLA_ANTIGRANIZO,
      especificaciones: JSON.stringify({
        anchoMetros: 7.0,
        gramaje: 65,
        color: 'cristal',
        proteccionGranizo: true,
        uvProtegido: true,
      }),
      precioBase: 32.0,
    },
    {
      sku: 'MT-17-B-420',
      nombre: 'Manta térmica 17 g/m² blanca 4.20m',
      familia: FamiliaProducto.MANTA_TERMICA,
      descripcion: 'Agrotextil térmico para protección de heladas y aceleración de cultivos.',
      especificaciones: JSON.stringify({
        anchoMetros: 4.2,
        gramaje: 17,
        color: 'blanco',
        material: 'polipropileno',
      }),
      precioBase: 9.8,
    },
    {
      sku: 'MT-RP-N-200',
      nombre: 'Malla de tutoreo rafia negra 2.00m',
      familia: FamiliaProducto.MALLA_TUTOR,
      descripcion: 'Malla para soporte vertical de tomate, pepino y chile.',
      especificaciones: JSON.stringify({
        anchoMetros: 2.0,
        cuadricula: '15x17 cm',
        color: 'negro',
        material: 'polipropileno',
      }),
      precioBase: 14.0,
    },
    {
      sku: 'MP-30-B-500',
      nombre: 'Malla antipájaros 30 mm 5.00m',
      familia: FamiliaProducto.MALLA_ANTIPAJAROS,
      especificaciones: JSON.stringify({
        anchoMetros: 5.0,
        cuadricula: '30 mm',
        color: 'negro',
        material: 'HDPE',
      }),
      precioBase: 19.0,
    },
  ]

  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    })
  }

  // --- Materias primas
  const materias = [
    { codigo: 'MP-HDPE-V', nombre: 'HDPE virgen', unidad: UnidadMedida.KILOGRAMO, stockMinimo: 2000 },
    { codigo: 'MP-PP-V', nombre: 'Polipropileno virgen', unidad: UnidadMedida.KILOGRAMO, stockMinimo: 1500 },
    { codigo: 'MP-UV', nombre: 'Aditivo UV', unidad: UnidadMedida.KILOGRAMO, stockMinimo: 200 },
    { codigo: 'MP-MB-N', nombre: 'Masterbatch negro', unidad: UnidadMedida.KILOGRAMO, stockMinimo: 300 },
    { codigo: 'MP-MB-V', nombre: 'Masterbatch verde', unidad: UnidadMedida.KILOGRAMO, stockMinimo: 150 },
  ]
  for (const m of materias) {
    await prisma.materiaPrima.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: m,
    })
  }

  // --- Máquinas (línea de producción típica de agrotextiles)
  const maquinas = [
    { codigo: 'TEL-01', nombre: 'Telar Raschel Karl Mayer 01', tipo: 'telar', capacidadHora: 120 },
    { codigo: 'TEL-02', nombre: 'Telar Raschel Karl Mayer 02', tipo: 'telar', capacidadHora: 120 },
    { codigo: 'EXT-01', nombre: 'Extrusora monofilamento', tipo: 'extrusora', capacidadHora: 350 },
    { codigo: 'TEJ-01', nombre: 'Tejedora circular cubre suelos', tipo: 'tejedora', capacidadHora: 220 },
    { codigo: 'COR-01', nombre: 'Cortadora longitudinal', tipo: 'cortadora', capacidadHora: 800 },
  ]
  for (const mq of maquinas) {
    await prisma.maquina.upsert({
      where: { codigo: mq.codigo },
      update: {},
      create: mq,
    })
  }

  // --- Almacenes
  const almacenes = [
    { codigo: 'ALM-MP', nombre: 'Almacén materia prima', tipo: 'MATERIA_PRIMA' },
    { codigo: 'ALM-PP', nombre: 'Almacén producto en proceso', tipo: 'PRODUCTO_PROCESO' },
    { codigo: 'ALM-PT', nombre: 'Almacén producto terminado', tipo: 'PRODUCTO_TERMINADO' },
  ]
  for (const a of almacenes) {
    await prisma.almacen.upsert({
      where: { codigo: a.codigo },
      update: {},
      create: a,
    })
  }

  // --- Clientes demo (agricultura protegida)
  const clientes = [
    {
      rfc: 'INA980515ABC',
      razonSocial: 'Invernaderos del Bajío S.A. de C.V.',
      contacto: 'Ing. Juan Pérez',
      email: 'compras@invbajio.mx',
      telefono: '477-123-4567',
      ciudad: 'León',
      estado: 'Guanajuato',
    },
    {
      rfc: 'AHC150302XYZ',
      razonSocial: 'Agrícola Hortícola Culiacán S.P.R.',
      contacto: 'Sra. Marisol Ríos',
      email: 'marisol@aghcul.mx',
      telefono: '667-555-1212',
      ciudad: 'Culiacán',
      estado: 'Sinaloa',
    },
    {
      rfc: 'BLM200810QRS',
      razonSocial: 'Berries La Montaña S. de R.L.',
      contacto: 'Lic. Andrés Vega',
      email: 'compras@berrieslm.mx',
      telefono: '443-888-0099',
      ciudad: 'Zamora',
      estado: 'Michoacán',
    },
  ]
  for (const c of clientes) {
    await prisma.cliente.upsert({
      where: { rfc: c.rfc! },
      update: {},
      create: c,
    })
  }

  // --- Pedido demo + orden de producción + algo de avance
  const cliente = await prisma.cliente.findFirst({ where: { rfc: 'INA980515ABC' } })
  const producto = await prisma.producto.findFirst({ where: { sku: 'MS-50-N-420' } })
  const maquina = await prisma.maquina.findFirst({ where: { codigo: 'TEL-01' } })

  if (cliente && producto && maquina) {
    const pedido = await prisma.pedido.upsert({
      where: { folio: 'PED-2026-00001' },
      update: {},
      create: {
        folio: 'PED-2026-00001',
        clienteId: cliente.id,
        fechaCompromiso: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        estado: 'EN_PRODUCCION',
        totalEstimado: 18500,
        items: {
          create: [
            {
              productoId: producto.id,
              cantidad: 1000,
              unidad: 'METRO_LINEAL',
              precioUnitario: 18.5,
              cantidadProducida: 420,
            },
          ],
        },
      },
    })

    await prisma.ordenProduccion.upsert({
      where: { folio: 'OP-2026-00001' },
      update: {},
      create: {
        folio: 'OP-2026-00001',
        pedidoId: pedido.id,
        productoId: producto.id,
        maquinaId: maquina.id,
        creadorId: operario.id,
        cantidadPlan: 1000,
        unidad: 'METRO_LINEAL',
        estado: 'EN_PROCESO',
        prioridad: 2,
        fechaPlan: new Date(),
        fechaInicio: new Date(Date.now() - 2 * 60 * 60 * 1000),
        registros: {
          create: [
            {
              operarioId: operario.id,
              maquinaId: maquina.id,
              turno: 'MATUTINO',
              inicio: new Date(Date.now() - 2 * 60 * 60 * 1000),
              fin: new Date(),
              cantidadOk: 420,
              cantidadMerma: 8,
              notas: 'Arranque sin novedad, calidad estable.',
            },
          ],
        },
      },
    })
  }

  console.log('✅ Seed completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
