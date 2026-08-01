// Mallatex MES — datos demo extraídos del Excel real del cliente (CLAUDE.md §5).
// NO inventados. NO reordenar. NO "limpiar".

import { ROLES } from './constants'

// OPERADORES REALES (extraídos del archivo de productividad)
// Promedios mL/hr basados en datos históricos reales de Mallatex
export const initialOperators = [
  { id:1,  name:'Karen',   role:ROLES.OPERADOR, tipo:'A', maquinas:['costura'],                          linea:'LC1', promedioMLhr: 213, color:'#c62828', initial:'K' },
  { id:2,  name:'Lorena',  role:ROLES.OPERADOR, tipo:'A', maquinas:['costura'],                          linea:'LC2', promedioMLhr: 218, color:'#e65100', initial:'L' },
  { id:3,  name:'Jesus',   role:ROLES.OPERADOR, tipo:'B', maquinas:['costura','embobinado'],             linea:'LC3', promedioMLhr: 231, color:'#1565c0', initial:'J' },
  { id:4,  name:'Carmen',  role:ROLES.OPERADOR, tipo:'A', maquinas:['costura'],                          linea:'LC4', promedioMLhr: 210, color:'#ad1457', initial:'C' },
  { id:5,  name:'Erik',    role:ROLES.OPERADOR, tipo:'D', maquinas:['corte','perforacion','costura','embobinado'], linea:'LK',  promedioMLhr: 491, color:'#2e7d32', initial:'E' },
  { id:6,  name:'Nayeli',  role:ROLES.OPERADOR, tipo:'B', maquinas:['perforacion','corte'],              linea:'LP',  promedioMLhr: 566, color:'#6a1b9a', initial:'N' },
  { id:7,  name:'Eva',     role:ROLES.OPERADOR, tipo:'C', maquinas:['embobinado','costura','corte'],     linea:'LE',  promedioMLhr: 486, color:'#558b2f', initial:'E' },
  { id:8,  name:'Sarai',   role:ROLES.OPERADOR, tipo:'A', maquinas:['costura'],                          linea:'LC3', promedioMLhr: 120, color:'#00838f', initial:'S' },
  { id:9,  name:'Juan',    role:ROLES.OPERADOR, tipo:'B', maquinas:['embobinado','costura'],             linea:'LE',  promedioMLhr: 714, color:'#4e342e', initial:'J' },
  { id:10, name:'Fátima',  role:ROLES.OPERADOR, tipo:'A', maquinas:['costura'],                          linea:'LC4', promedioMLhr: 200, color:'#bf360c', initial:'F' },
  { id:11, name:'Néstor',  role:ROLES.MONTACARGAS_PROD, tipo:null, maquinas:[], linea:null, color:'#37474f', initial:'N' },
  { id:12, name:'Carlos A.', role:ROLES.PRODUCCION, tipo:null, maquinas:[], linea:null, color:'#5d4037', initial:'C' },
  { id:13, name:'Alberto O.', role:ROLES.ALMACEN, tipo:null, maquinas:[], linea:null, color:'#283593', initial:'A' },
  { id:14, name:'Víctor G.', role:ROLES.OPERACIONES, tipo:null, maquinas:[], linea:null, color:'#01579b', initial:'V' },
  { id:15, name:'María L.', role:ROLES.COBRANZA, tipo:null, maquinas:[], linea:null, color:'#bf360c', initial:'M' },
]

// PEDIDOS REALES (extraídos de PLANEACION_DE_PEDIDOS.xlsx — MAYO/ABRIL 2026)
// Códigos reales: EZE (Exp. Zamora), FEL (Construcciones), VEG, VFGC, POCC, PSOP
export const initialOrders = [
  // EZE 503 — Driscolls, pedido masivo con sub-campos (mega-pedido real del Excel)
  { id:'EZE 503', cliente:'DRISCOLLS OPERACIONES', material:'MALLA ANTIGRANIZO NEGRA', medida:'11.10 × 50 m', rollos:2900, ancho:11.10, largo:50,
    procesos:['costura','embobinado'], procesoActual:'costura', linea:'LC2', operador:[2,3], meta:2900, hechas:1071,
    m2:1609500, terminados:1071, entregados:925, pendientes:1875, enPiso:146,
    fechaPedido:'2025-01-17', compromiso:'2026-05-15', formaEntrega:'MALLATEX envía campo',
    estado:'en-produccion', pagoConfirmado:true, materialEgresado:true,
    observaciones:'Último acuerdo: entregar 500 rollos 9.60 × 50 el 15/05/26',
    subPedidos:['Egipto','San Francisco','Atenco','San Jose','Cabaña'] },

  // FEL 10 — Construcciones y Tuberías
  { id:'FEL 10', cliente:'CONSTRUCCIONES Y TUBERIAS DEL CENTRO', material:'ANTIAFIDO 12/22 CRISTAL', medida:'1.50 × 70 m', rollos:5, ancho:1.5, largo:70,
    procesos:['costura'], procesoActual:null, linea:null, operador:[], meta:5, hechas:5,
    m2:945, terminados:5, entregados:5, pendientes:0, enPiso:0,
    fechaPedido:'2026-04-10', compromiso:'2026-05-07', formaEntrega:'ALMACEN',
    estado:'entregado', pagoConfirmado:true, materialEgresado:true },

  // FEL 14 — Agronatura
  { id:'FEL 14', cliente:'AGRONATURA SUPPLY', material:'ANTIGRANIZO NEGRA', medida:'8.60 × 66 m', rollos:10, ancho:8.6, largo:66,
    procesos:['costura','embobinado'], procesoActual:null, linea:null, operador:[], meta:10, hechas:10,
    m2:5676, terminados:10, entregados:10, pendientes:0, enPiso:0,
    fechaPedido:'2026-04-16', compromiso:'2026-05-04', formaEntrega:'ALMACEN',
    estado:'entregado', pagoConfirmado:true, materialEgresado:true },

  // VFGC 886 — pedido en piso ahora
  { id:'VFGC 886', cliente:'BERRYMEX AGROSOLUCIONES', material:'CUBRESUELO NEGRO 105GR', medida:'1.65 × 500 m', rollos:8, ancho:1.65, largo:500,
    procesos:['perforacion','embobinado'], procesoActual:'embobinado', linea:'LE', operador:[7], meta:8, hechas:4,
    m2:6600, terminados:4, entregados:0, pendientes:4, enPiso:4,
    fechaPedido:'2026-05-20', compromiso:'2026-05-28', formaEntrega:'MALLATEX',
    estado:'en-produccion', pagoConfirmado:true, materialEgresado:true,
    observaciones:'Cubresuelo Negro embobinado · 1.65 x 500 — 4 piezas al cierre del 21/05' },

  // VEG 1106 — Agrícola Rincón Palmas
  { id:'VEG 1106', cliente:'AGRICOLA EL RINCON DE LAS PALMAS', material:'MALLA ANTIAFIDO 20/10 CRISTAL', medida:'10.70 × 100 m', rollos:2, ancho:10.7, largo:100,
    procesos:['costura'], procesoActual:null, linea:null, operador:[], meta:2, hechas:2,
    m2:2140, terminados:2, entregados:2, pendientes:0, enPiso:0,
    fechaPedido:'2026-02-03', compromiso:'2026-02-27', formaEntrega:'PAQUETERIA',
    estado:'entregado', pagoConfirmado:true, materialEgresado:true },

  // VFGC 891 — pedido nuevo en piso
  { id:'VFGC 891', cliente:'NATURESWEET INVERNADEROS', material:'MALLA RASCHEL 35% BLANCA', medida:'4.20 × 67 m', rollos:12, ancho:4.20, largo:67,
    procesos:['costura'], procesoActual:'costura', linea:'LC1', operador:[1], meta:12, hechas:7,
    m2:3379, terminados:7, entregados:0, pendientes:5, enPiso:5,
    fechaPedido:'2026-05-15', compromiso:'2026-05-30', formaEntrega:'MALLATEX',
    estado:'en-produccion', pagoConfirmado:true, materialEgresado:true,
    observaciones:'Karen produciendo 7 piezas — 672 ml turno' },

  // POCC 245 — pedido detenido (status real del Excel)
  { id:'POCC 245', cliente:'PRODUCTORA HASSIBA', material:'CUBRESUELO BLANCO 130', medida:'3.30 × 67 m', rollos:25, ancho:3.30, largo:67,
    procesos:['costura'], procesoActual:null, linea:null, operador:[], meta:25, hechas:0,
    m2:5527, terminados:0, entregados:0, pendientes:25, enPiso:0,
    fechaPedido:'2026-05-18', compromiso:'2026-06-05', formaEntrega:'MALLATEX',
    estado:'detenido', pagoConfirmado:false, materialEgresado:false,
    observaciones:'Detenido — pendiente confirmar pago crédito' },

  // PSOP 612 — corte programado
  { id:'PSOP 612', cliente:'BIOPARQUES DE OCCIDENTE', material:'MONOFILAMENTO 70% NEGRO', medida:'4.20 × 100 m', rollos:30, ancho:4.20, largo:100,
    procesos:['corte','perforacion','embobinado'], procesoActual:'corte', linea:'LK', operador:[5], meta:30, hechas:18,
    m2:12600, terminados:18, entregados:0, pendientes:12, enPiso:12,
    fechaPedido:'2026-05-19', compromiso:'2026-05-29', formaEntrega:'MALLATEX',
    estado:'en-produccion', pagoConfirmado:true, materialEgresado:true,
    observaciones:'Erik en corte · LK · 4.20 × 100 — 466 ml/hr promedio' },

  // VEG 1108 — perforado
  { id:'VEG 1108', cliente:'AGRO VIVA', material:'MONOFILAMENTO 90% NEGRO', medida:'1.65 × 500 m', rollos:6, ancho:1.65, largo:500,
    procesos:['perforacion','embobinado'], procesoActual:'perforacion', linea:'LP', operador:[6], meta:6, hechas:6,
    m2:4950, terminados:6, entregados:0, pendientes:0, enPiso:6,
    fechaPedido:'2026-05-21', compromiso:'2026-05-27', formaEntrega:'MALLATEX',
    estado:'terminado', pagoConfirmado:true, materialEgresado:true,
    observaciones:'Nayeli LP · 3500 ml en turno · pesaje pendiente' },

  // FEL 28 — antigranizo grande
  { id:'FEL 28', cliente:'AGRONEGOCIOS ARAN', material:'ANTIGRANIZO NEGRA', medida:'6.20 × 50 m', rollos:80, ancho:6.20, largo:50,
    procesos:['costura','embobinado'], procesoActual:'costura', linea:'LC2', operador:[2], meta:80, hechas:0,
    m2:24800, terminados:0, entregados:0, pendientes:80, enPiso:0,
    fechaPedido:'2026-05-22', compromiso:'2026-06-10', formaEntrega:'TRES GUERRAS',
    estado:'liberado', pagoConfirmado:true, materialEgresado:false,
    observaciones:'Cliente solicita Lorena para la línea' },
]

// Rollos del almacén con material real del Excel
export const initialRolls = [
  { id:'R-04563', material:'CUBRESUELO AZORRILLADO 105GR', medida:'1.80 × 500', lote:'4653', peso:87.5, ubicacion:'A-3-12', pedido:'VFGC 886', estado:'en-linea', empezado:false },
  { id:'R-04568', material:'CUBRESUELO NEGRO 105GR', medida:'1.65 × 500', lote:'4768', peso:81.2, ubicacion:'A-3-15', pedido:'VFGC 886', estado:'en-linea', empezado:false },
  { id:'R-04612', material:'MALLA RASCHEL 35% BLANCA', medida:'4.20 × 67', lote:'4612', peso:23.8, ubicacion:'B-1-04', pedido:'VFGC 891', estado:'reservado', empezado:true },
  { id:'R-04630', material:'MALLA ANTIGRANIZO NEGRA', medida:'11.10 × 50', lote:'3049', peso:92.4, ubicacion:'C-2-08', pedido:'EZE 503', estado:'en-linea', empezado:false },
  { id:'R-04641', material:'MONOFILAMENTO 90% NEGRO', medida:'1.65 × 500', lote:'2231', peso:18.7, ubicacion:'B-2-11', pedido:'VEG 1108', estado:'reservado', empezado:false },
  { id:'R-04702', material:'CUBRESUELO BLANCO 130', medida:'3.30 × 67', lote:'5012', peso:34.2, ubicacion:'C-3-02', pedido:null, estado:'almacen', empezado:false },
  { id:'R-04715', material:'MONOFILAMENTO 70% NEGRO', medida:'4.20 × 100', lote:'5215', peso:42.0, ubicacion:'D-1-08', pedido:'PSOP 612', estado:'en-linea', empezado:false },
  { id:'R-04720', material:'ANTIAFIDO 10X16 CRISTAL', medida:'2.70 × 100', lote:'5320', peso:12.5, ubicacion:'B-4-03', pedido:null, estado:'almacen', empezado:true },
  { id:'R-04733', material:'CUBRESUELO BLANCO 105', medida:'1.65 × 500', lote:'4653', peso:17.4, ubicacion:'A-2-08', pedido:null, estado:'almacen', empezado:false },
  { id:'R-04745', material:'ANTIGRANIZO NEGRA', medida:'6.20 × 50', lote:'5421', peso:54.0, ubicacion:'C-1-15', pedido:'FEL 28', estado:'reservado', empezado:false },
]

// Recepciones MT-DT-001 (proceso de ingreso)
export const initialRecepciones = [
  { id:'REC-2026-0142', fecha:'2026-05-22', proveedor:'Polysembras SA', packingList:'PL-1840', factura:'A-23-882', rollos:24, pesoTotal:1450.5, muestreoOK:true, ingresadoSAE:true, responsable:'Alberto O.' },
  { id:'REC-2026-0141', fecha:'2026-05-21', proveedor:'TexImport', packingList:'PL-1838', factura:'B-44-201', rollos:18, pesoTotal:892.3, muestreoOK:true, ingresadoSAE:true, responsable:'Alberto O.' },
  { id:'REC-2026-0140', fecha:'2026-05-20', proveedor:'Polysembras SA', packingList:'PL-1835', factura:'A-23-865', rollos:32, pesoTotal:2105.0, muestreoOK:false, ingresadoSAE:false, responsable:'Alberto O.', incidencia:'Diferencias en peso: 2 rollos -8% del declarado' },
]

// Egresos MT-DT-002 (proceso de egreso de material)
export const initialEgresos = [
  { id:'EGR-2026-0298', fecha:'2026-05-24', pedido:'VFGC 886', material:'CUBRESUELO NEGRO 105GR', rollos:8, m2:6600, empezadosUsados:1, responsableAlmacen:'Alberto O.', responsableProd:'Carlos A.', confirmado:true },
  { id:'EGR-2026-0297', fecha:'2026-05-24', pedido:'EZE 503', material:'MALLA ANTIGRANIZO NEGRA', rollos:200, m2:111000, empezadosUsados:2, responsableAlmacen:'Alberto O.', responsableProd:'Carlos A.', confirmado:true },
  { id:'EGR-2026-0296', fecha:'2026-05-23', pedido:'VEG 1108', material:'MONOFILAMENTO 90% NEGRO', rollos:6, m2:4950, empezadosUsados:0, responsableAlmacen:'Alberto O.', responsableProd:'Carlos A.', confirmado:true },
]

// Avisos con líneas reales (códigos LC1-LC4, LK, LP, LE)
export const initialAvisos = [
  { id:1, hora:'09:14', linea:'LC3', operador:'Jesus', tipo:'sin-material', desc:'Sin material — Cubresuelo Blanco 130', tiempo:'14:32', estado:'urgente' },
  { id:2, hora:'08:47', linea:'LK', operador:'Erik', tipo:'falla', desc:'Cuchilla mal afilada', tiempo:'06:11', estado:'revisar' },
  { id:3, hora:'08:22', linea:'LP', operador:'Nayeli', tipo:'sin-hilo', desc:'Hilo terminándose', tiempo:'02:00', estado:'resuelto' },
]

// Mermas con líneas y pedidos reales
export const initialMermas = [
  { id:1, fecha:'2026-05-23', operador:'Erik', linea:'LK', material:'CUBRESUELO NEGRO 105GR', metros:9, categoria:'desperdicio', defecto:'corte-mal', pedido:'PSOP 612' },
  { id:2, fecha:'2026-05-24', operador:'Lorena', linea:'LC2', material:'MALLA ANTIGRANIZO NEGRA', metros:1.5, categoria:'desperdicio', defecto:'corte-mal', pedido:'EZE 503' },
  { id:3, fecha:'2026-05-25', operador:'Karen', linea:'LC1', material:'MALLA RASCHEL 35% BLANCA', metros:3.5, categoria:'defecto', defecto:'rollo-defectuoso', pedido:'VFGC 891' },
]

// Producto terminado MT-DT-006 (check list)
export const initialProductosTerminados = [
  { id:'PT-VFGC886-01', pedido:'VFGC 886', material:'CUBRESUELO NEGRO 105GR', medida:'1.65 × 500', rollos:1, pesoTeorico:81.2, pesoReal:80.8, fecha:'2026-05-25', hora:'13:45', verificado:true, responsable:'Néstor' },
  { id:'PT-VEG1108-01', pedido:'VEG 1108', material:'MONOFILAMENTO 90% NEGRO', medida:'1.65 × 500', rollos:1, pesoTeorico:18.7, pesoReal:18.2, fecha:'2026-05-25', hora:'10:22', verificado:true, responsable:'Néstor' },
]

// Registro de productividad por turno (real, del Excel "Hora Real de Comienzo")
export const initialProductividad = [
  { fecha:'2026-05-21', linea:'LC1', operador:'Karen',  horaInicio:'06:05', horaFinal:'06:39', imprevistos:0,  tiempoEfectivo:34,  mLTurno:112,  piezasTurno:2,  descripcion:'Antigranizo Negra costura 3.70 + 4.93 = 8.63 × 56' },
  { fecha:'2026-05-21', linea:'LC2', operador:'Lorena', horaInicio:'06:03', horaFinal:'06:47', imprevistos:0,  tiempoEfectivo:44,  mLTurno:100,  piezasTurno:2,  descripcion:'Antigranizo Negra costura 6.20 + 3.70 = 9.90 × 50' },
  { fecha:'2026-05-21', linea:'LK',  operador:'Erik',   horaInicio:'06:10', horaFinal:'07:39', imprevistos:0,  tiempoEfectivo:89,  mLTurno:740,  piezasTurno:4,  descripcion:'Cubresuelo Negro contadas 4.20 × 185' },
  { fecha:'2026-05-21', linea:'LE',  operador:'Eva',    horaInicio:'06:05', horaFinal:'13:55', imprevistos:45, tiempoEfectivo:425, mLTurno:2920, piezasTurno:8,  descripcion:'Cubresuelo Negro embobinado 1.65 × 500 (4 pz) /// Raschel 50% embobinado 16.80 × 60 (7 pz) /// Cubresuelo Azorrillado embobinado 1.80 × 500 (1 pz)' },
  { fecha:'2026-05-21', linea:'LC4', operador:'Carmen', horaInicio:'06:05', horaFinal:'07:20', imprevistos:0,  tiempoEfectivo:75,  mLTurno:180,  piezasTurno:1,  descripcion:'Rachel Negra 50% costura 4.20 + 4.20 = 8.40 + 4.20 = 12.60 + 4.20 = 16.80 × 60' },
  { fecha:'2026-05-21', linea:'LP',  operador:'Nayeli', horaInicio:'06:15', horaFinal:'13:55', imprevistos:45, tiempoEfectivo:415, mLTurno:3500, piezasTurno:7,  descripcion:'Cubresuelo Azorrillado perforado 1.80 × 500' },
  { fecha:'2026-05-21', linea:'LC3', operador:'Jesus',  horaInicio:'06:10', horaFinal:'07:30', imprevistos:0,  tiempoEfectivo:80,  mLTurno:203,  piezasTurno:3,  descripcion:'Cubresuelo Blanco 130 gr costura 4.20 + 5.40 = 9.60 × 67' },
  { fecha:'2026-05-20', linea:'LC1', operador:'Karen',  horaInicio:'06:05', horaFinal:'09:20', imprevistos:0,  tiempoEfectivo:195, mLTurno:672,  piezasTurno:12, descripcion:'Antigranizo Negra costura 3.70 + 1.23 = 4.93 × 56' },
  { fecha:'2026-05-20', linea:'LC2', operador:'Lorena', horaInicio:'06:05', horaFinal:'09:10', imprevistos:0,  tiempoEfectivo:185, mLTurno:300,  piezasTurno:6,  descripcion:'Antigranizo Negra costura 6.20 + 3.70 = 9.90 × 50' },
  { fecha:'2026-05-20', linea:'LK',  operador:'Erik',   horaInicio:'06:05', horaFinal:'09:31', imprevistos:0,  tiempoEfectivo:206, mLTurno:1600, piezasTurno:4,  descripcion:'Cubresuelo Negro embobinado 1.65 × 400' },
  { fecha:'2026-05-20', linea:'LE',  operador:'Eva',    horaInicio:'06:32', horaFinal:'13:50', imprevistos:85, tiempoEfectivo:353, mLTurno:4000, piezasTurno:8,  descripcion:'Cubresuelo Negro embobinado 1.65 × 500' },
  { fecha:'2026-05-20', linea:'LP',  operador:'Nayeli', horaInicio:'06:15', horaFinal:'13:14', imprevistos:76, tiempoEfectivo:343, mLTurno:3000, piezasTurno:6,  descripcion:'Cubresuelo Negro perforado 1.65 × 500' },
]
