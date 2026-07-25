/* Generador del Manual de Usuario en DOCX (editable) — Mallatex.
 * Uso:  node docs/manual/build_docx.cjs   → docs/Manual_Mallatex_Plataforma_Asistencia.docx
 * Requiere el paquete npm `docx` (npm i docx). */
const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak,
  TableOfContents, Header, Footer, PageNumber,
} = require('docx');

function sizeOf(buf) { return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; }

const ROOT = path.join(__dirname, '..', '..');
const SHOTS = path.join(ROOT, 'docs', 'screenshots');
const ASSETS = path.join(ROOT, 'docs', 'manual-assets');

const RED = 'ED3237', BLACK = '232121', INK = '3F3D3D', GRAY = '606062', LIGHT = 'EEEEF0';

const runsOf = (parts) => (Array.isArray(parts) ? parts : [parts]).map((p) => typeof p === 'string' ? new TextRun({ text: p, color: INK, size: 21 }) : p);
const P = (parts, opts = {}) => new Paragraph({ spacing: { after: 120, line: 276 }, children: runsOf(parts), ...opts });
const B = (t) => new TextRun({ text: t, bold: true, color: INK, size: 21 });
const T = (t) => new TextRun({ text: t, color: INK, size: 21 });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 140 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 6 } }, children: [new TextRun({ text: t, bold: true, color: RED, size: 30 })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 }, children: [new TextRun({ text: t, bold: true, color: BLACK, size: 24 })] });
const bullet = (parts) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60, line: 268 }, children: runsOf(parts) });
const step = (n, parts) => new Paragraph({ spacing: { after: 70, line: 268 }, indent: { left: 360, hanging: 300 }, children: [new TextRun({ text: n + '. ', bold: true, color: RED, size: 21 }), ...runsOf(parts)] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
function callout(parts, warn = false) {
  return new Paragraph({ spacing: { before: 60, after: 160, line: 272 }, shading: { type: ShadingType.CLEAR, color: 'auto', fill: warn ? 'FFF7E6' : 'FBF3F3' }, border: { left: { style: BorderStyle.SINGLE, size: 20, color: warn ? 'D97706' : RED, space: 14 } }, children: [new TextRun({ text: warn ? '⚠  ' : 'ℹ  ', bold: true, color: warn ? 'B45309' : RED, size: 21 }), ...runsOf(parts)] });
}
function image(file, { maxW = 600, maxH = 660, caption } = {}) {
  const buf = fs.readFileSync(path.join(SHOTS, file));
  const dim = sizeOf(buf);
  let w = maxW, h = Math.round((maxW * dim.height) / dim.width);
  if (h > maxH) { h = maxH; w = Math.round((maxH * dim.width) / dim.height); }
  const out = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 40 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: w, height: h } })] })];
  if (caption) out.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: caption, italics: true, color: GRAY, size: 17 })] }));
  return out;
}
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (children, wdt, opts = {}) => new TableCell({ width: { size: wdt, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 100, right: 100 }, shading: opts.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } : undefined, children });
  const headRow = new TableRow({ tableHeader: true, children: headers.map((h, i) => cell([new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 19 })] })], widths[i], { fill: RED })) });
  const bodyRows = rows.map((r, ri) => new TableRow({ children: r.map((c, i) => cell([new Paragraph({ children: [new TextRun({ text: String(c), color: INK, size: 19 })] })], widths[i], { fill: ri % 2 ? LIGHT : 'FFFFFF' })) }));
  return new Table({ columnWidths: widths, width: { size: total, type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E6E2E2' }, bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E6E2E2' }, left: { style: BorderStyle.SINGLE, size: 2, color: 'E6E2E2' }, right: { style: BorderStyle.SINGLE, size: 2, color: 'E6E2E2' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'EFECEC' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'EFECEC' } }, rows: [headRow, ...bodyRows] });
}

const body = [];
const imagoBuf = fs.readFileSync(path.join(ASSETS, 'mallatex-logo.png'));
const imagoDim = sizeOf(imagoBuf);
const imagoW = 440, imagoH = Math.round((imagoW * imagoDim.height) / imagoDim.width);
body.push(
  new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: imagoBuf, transformation: { width: imagoW, height: imagoH } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 260, after: 320 }, children: [new TextRun({ text: 'Plataforma de Asistencia · Aspel NOI', color: BLACK, size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 10 }, bottom: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 10 } }, children: [new TextRun({ text: 'MANUAL DE USUARIO', bold: true, color: BLACK, size: 40 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 }, children: [new TextRun({ text: 'Control de asistencia, incidencias, tiempo extra y exportación a nómina', color: GRAY, size: 22 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600 }, children: [new TextRun({ text: 'Versión 1.0 · Julio 2026', color: INK, size: 20 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: 'powered by ', color: GRAY, size: 20 }), new TextRun({ text: 'Evorgyn', bold: true, color: BLACK, size: 20 })] }),
  pageBreak(),
  new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 160 }, children: [new TextRun({ text: 'Contenido', bold: true, color: RED, size: 30 })] }),
  new TableOfContents('Contenido', { hyperlink: true, headingStyleRange: '1-2' }),
  pageBreak(),
);

const S = (parts) => body.push(P(parts));
body.push(H1('1. Introducción'));
S([B('Mallatex · Plataforma de Asistencia'), T(' es el sistema con el que Mallatex controla la asistencia de su personal y prepara la información de nómina. Funciona como una '), B('capa de control entre el checador facial (Hikvision) y Aspel NOI'), T(' —el módulo de nómina del ERP de Aspel—, de modo que la información se '), B('revisa y valida antes'), T(' de generar los movimientos de nómina.')]);
body.push(callout([B('Principio clave: '), T('la plataforma nunca envía registros crudos a Aspel NOI. Consolida sólo la información ya revisada y autorizada del periodo, y cada ajuste queda registrado en la bitácora con usuario, fecha y motivo.')]));
body.push(H2('¿A quién está dirigido este manual?'));
body.push(bullet([B('Responsable de nómina: '), T('revisión diaria, corrección, incidencias, horas extra y exportación.')]));
body.push(bullet([B('Contador general: '), T('autorización de incidencias y tiempo extra, cierre de periodo y catálogos.')]));
body.push(bullet([B('Administrador: '), T('configuración, reglas, usuarios y todo lo anterior.')]));
body.push(H2('Beneficios'));
['Menos captura manual y menos dependencia de hojas firmadas.', 'Mayor precisión: las incidencias pasan por reglas, revisión y validación.', 'Trazabilidad completa de cada ajuste.', 'Cierre de nómina más ágil y una base lista para crecer por módulos.'].forEach((t) => body.push(bullet(t)));

body.push(pageBreak(), H1('2. Conceptos clave'), H2('Flujo operativo'));
S('Toda la operación sigue seis pasos, visibles también en el Tablero:');
body.push(table(['#', 'Etapa', 'Descripción'], [['1', 'Captura facial', 'El colaborador registra entrada y salida en el checador.'], ['2', 'Sincronización', 'La plataforma descarga las checadas y aplica horarios y reglas.'], ['3', 'Revisión', 'Nómina visualiza asistencias, retardos, faltas y omisiones.'], ['4', 'Corrección', 'Se clasifican vacaciones, permisos, incidencias y ajustes.'], ['5', 'Autorización', 'Se validan las horas extra y se cierra el periodo.'], ['6', 'Exportación NOI', 'Se genera la información compatible para su carga en Aspel NOI.']], [520, 2200, 5680]));
body.push(H2('Roles y permisos'));
body.push(table(['Acción', 'Nómina', 'Contador', 'Admin'], [['Ver tablero, asistencia, reportes', 'Sí', 'Sí', 'Sí'], ['Sincronizar checador / reprocesar', 'Sí', 'Sí', 'Sí'], ['Corregir asistencia (con motivo)', 'Sí', 'Sí', 'Sí'], ['Registrar incidencias', 'Sí', 'Sí', 'Sí'], ['Autorizar / rechazar incidencias', '—', 'Sí', 'Sí'], ['Autorizar / rechazar horas extra', 'Sí', 'Sí', 'Sí'], ['Cerrar periodo', 'Sí', 'Sí', 'Sí'], ['Reabrir periodo', '—', 'Sí', 'Sí'], ['Empleados, horarios, conceptos NOI', '—', 'Sí', 'Sí'], ['Reglas globales y usuarios', '—', '—', 'Sí']], [4600, 1200, 1200, 1200]));
body.push(H2('Periodos de nómina'));
S('El trabajo se organiza por periodos (por ejemplo, quincenas). Un periodo puede estar Abierto (admite cambios) o Cerrado (bloqueado). El periodo activo se elige en la barra superior y determina lo que se muestra en cada pantalla.');
body.push(H2('Aspel NOI'));
S('Aspel NOI es el módulo de nómina del ERP de Aspel. La plataforma genera un archivo de interfaz con los movimientos del periodo, mapeados a los conceptos de NOI del cliente, listo para su carga.');

body.push(pageBreak(), H1('3. Acceso al sistema'));
body.push(...image('01-login.png', { caption: 'Pantalla de acceso' }));
body.push(H2('Iniciar sesión'));
body.push(step(1, [T('Abra la plataforma en su navegador (por ejemplo '), B('http://localhost:3000'), T(').')]));
body.push(step(2, 'Escriba su correo y contraseña.'));
body.push(step(3, [T('Presione '), B('Entrar'), T('. Será dirigido al Tablero.')]));
body.push(H2('Cuentas y roles de demostración'));
body.push(table(['Rol', 'Correo', 'Contraseña'], [['Administrador', 'admin@mallatex.mx', 'mallatex2026'], ['Contador general', 'contabilidad@mallatex.mx', 'mallatex2026'], ['Responsable de nómina', 'nomina@mallatex.mx', 'mallatex2026']], [3200, 3800, 3000]));
body.push(callout([B('Cerrar sesión: '), T('use el ícono de encendido (⏻) en la esquina superior derecha, junto a su nombre.')]));

body.push(pageBreak(), H1('4. Interfaz general'), H2('Barra lateral (navegación)'));
S('Agrupa los módulos en cuatro secciones. Las opciones visibles dependen de su rol.');
body.push(bullet([B('Operación: '), T('Tablero, Revisión de asistencia, Faltas e incidencias, Horas extra.')]));
body.push(bullet([B('Nómina: '), T('Periodos y NOI.')]));
body.push(bullet([B('Catálogos: '), T('Empleados, Horarios y reglas, Checador.')]));
body.push(bullet([B('Administración: '), T('Usuarios (sólo Administrador) y Bitácora.')]));
body.push(H2('Barra superior'));
body.push(bullet('Título de la pantalla actual y periodo en curso.'));
body.push(bullet([B('Selector de Periodo: '), T('cambia el periodo de trabajo; todas las pantallas se actualizan al periodo elegido.')]));
body.push(bullet('Identidad del usuario (nombre y rol) y botón para cerrar sesión.'));

body.push(pageBreak(), H1('5. Tablero'));
S([B('Propósito. '), T('Ofrece una vista ejecutiva del periodo: indicadores, distribución de asistencia, estado del checador y pendientes.')]);
body.push(...image('02-tablero.png', { caption: 'Tablero principal' }));
body.push(H2('Elementos de la pantalla'));
body.push(bullet([B('Indicadores (KPIs): '), T('empleados activos, asistencias, faltas/omisiones y horas extra autorizadas.')]));
body.push(bullet([B('Distribución de asistencia: '), T('barras con el conteo de cada estatus del periodo.')]));
body.push(bullet([B('Checador: '), T('modelo del dispositivo y última sincronización, con acceso directo.')]));
body.push(bullet([B('Pendientes por autorizar: '), T('incidencias, horas extra y empleados elegibles a bono.')]));
body.push(bullet([B('Flujo operativo: '), T('recordatorio visual de las seis etapas del proceso.')]));

body.push(pageBreak(), H1('6. Revisión de asistencia'));
S([B('Propósito. '), T('Pantalla central de trabajo diario: muestra el estatus calculado de cada empleado por día y permite corregirlo.')]);
body.push(...image('03-revision-asistencia.png', { caption: 'Revisión de asistencia diaria' }));
body.push(H2('Estatus de asistencia'));
body.push(table(['Estatus', 'Significado'], [['Asistencia', 'Entrada dentro de la tolerancia del turno.'], ['Retardo', 'Entrada después de la tolerancia y hasta el umbral de retardo.'], ['Falta', 'Sin checadas en día laborable o retardo mayor al umbral.'], ['Omisión', 'Registró una sola checada (falta entrada o salida).'], ['Vacaciones / Permiso / Incapacidad', 'Proviene de una incidencia autorizada.'], ['Descanso', 'Día no laborable según el horario.']], [3400, 6000]));
body.push(H2('Corregir un registro'));
body.push(step(1, [T('Presione '), B('Corregir'), T(' en la fila deseada.')]));
body.push(step(2, 'Seleccione el nuevo estatus y, si aplica, ajuste los minutos de tiempo extra.'));
body.push(step(3, [B('Escriba el motivo (obligatorio) '), T('y guarde. El registro se marca como “manual”.')]));
body.push(callout([T('Toda corrección exige un motivo y queda en la '), B('bitácora'), T('. En un periodo '), B('cerrado'), T(' no se permiten correcciones.')]));

body.push(pageBreak(), H1('7. Faltas e incidencias'));
S([B('Propósito. '), T('Registrar y autorizar vacaciones, permisos, incapacidades, faltas justificadas y días festivos. Una incidencia autorizada tiene prioridad sobre el cálculo automático.')]);
body.push(...image('04-incidencias.png', { caption: 'Listado de incidencias' }));
body.push(H2('Registrar una incidencia'));
body.push(step(1, [T('Presione '), B('+ Nueva incidencia'), T('.')]));
body.push(step(2, 'Elija empleado, tipo, fechas (desde/hasta) y motivo.'));
body.push(step(3, [T('Registre. La incidencia queda en estado '), B('Pendiente'), T('.')]));
body.push(...image('12-modal-incidencia.png', { caption: 'Alta de una nueva incidencia', maxH: 520 }));
body.push(H2('Autorizar o rechazar'));
body.push(bullet([B('Autorizar '), T('(Contador/Administrador): la incidencia se refleja de inmediato en la asistencia del rango.')]));
body.push(bullet([B('Rechazar: '), T('solicita un motivo y no afecta la asistencia.')]));

body.push(pageBreak(), H1('8. Horas extra'));
S([B('Propósito. '), T('Revisar y autorizar el tiempo extra calculado a partir de las checadas. Nada se exporta a NOI sin autorización.')]);
body.push(...image('05-horas-extra.png', { caption: 'Autorización de tiempo extra' }));
body.push(H2('Autorizar tiempo extra'));
body.push(step(1, 'Filtre por estado (Pendientes) y por rango de fechas.'));
body.push(step(2, [T('Ajuste, si es necesario, las '), B('horas a autorizar'), T(' y el '), B('tipo'), T(' (Ordinario o Doble/Triple).')]));
body.push(step(3, [T('Presione '), B('Autorizar'), T(' (o '), B('Rechazar'), T('). El registro queda validado y con responsable.')]));

body.push(pageBreak(), H1('9. Periodos y NOI'));
S([B('Propósito. '), T('Consolidar el periodo, revisar el resumen por empleado, generar los movimientos para Aspel NOI, exportarlos y cerrar el periodo.')]);
body.push(...image('06-periodos-noi.png', { caption: 'Resumen del periodo, movimientos NOI y conceptos', maxH: 720 }));
body.push(H2('Exportar a NOI'));
body.push(step(1, 'Verifique que no haya pendientes (la alerta lo indica).'));
body.push(step(2, [T('Presione '), B('Exportar .txt'), T(' o '), B('Exportar .csv'), T('.')]));
body.push(step(3, 'Se descarga el archivo de interfaz listo para cargar en Aspel NOI.'));
body.push(callout([T('Si existen incidencias u horas extra pendientes, la exportación se '), B('bloquea'), T('; puede forzarse de forma explícita al confirmar.')]));
body.push(H2('Cerrar y reabrir el periodo'));
body.push(bullet([B('Cerrar periodo: '), T('bloquea correcciones. Si hay pendientes, pide confirmación.')]));
body.push(bullet([B('Reabrir '), T('(Contador/Administrador): vuelve el periodo a Abierto.')]));

body.push(pageBreak(), H2('9.1 Percepciones variables (kilometraje, costura por m², comisiones)'));
S([B('Propósito. '), T('Administrar pagos que no dependen del reloj checador sino de una cantidad capturada por periodo: el bono por kilometraje del conductor, la costura extra por metro cuadrado del operador de producción y la comisión sobre ventas del vendedor. Se abre en '), B('Nómina → Percepciones variables'), T('.')]);
body.push(...image('30-percepciones-variables.png', { caption: 'Percepciones variables: capturas del periodo y catálogo de conceptos', maxH: 700 }));
body.push(H2('Conceptos variables'));
S([T('Cada tipo de pago es un concepto configurable con su número de Aspel NOI y su forma de cálculo:')]);
body.push(table(['Forma de cálculo', 'Cómo se obtiene el importe', 'Ejemplo'], [['Tarifa por unidad', 'cantidad × tarifa', '640 km × $2.50 = $1,600'], ['Porcentaje sobre base', 'base × (porcentaje ÷ 100)', '$92,000 × 3 % = $2,760'], ['Importe directo', 'se captura el importe ya calculado', '—']], [2600, 3200, 2400]));
S([T('Con '), B('+ Concepto'), T(' (Contador/Administrador) se crea un concepto con nombre, número NOI, forma de cálculo, unidad (km, m², $ ventas…), tarifa/porcentaje y área sugerida.')]);
body.push(H2('Capturar una percepción'));
body.push(step(1, [T('Con el periodo '), B('Abierto'), T(', presione '), B('+ Captura'), T('.')]));
body.push(step(2, 'Elija el empleado y el concepto.'));
body.push(step(3, [T('Escriba la '), B('cantidad'), T(' (kilómetros, metros cuadrados o monto de ventas). El importe se calcula en vivo.')]));
body.push(step(4, [T('Opcional: indique una '), B('tarifa o porcentaje distinto'), T(' para ese empleado; si se deja vacío, se usa la del concepto.')]));
body.push(step(5, 'Guarde. La captura aparece en la tabla del periodo.'));
body.push(callout([T('Los importes capturados se '), B('suman a los movimientos calculados por asistencia'), T(' y viajan en la misma exportación a Aspel NOI. Sólo se capturan en periodos abiertos; al cerrar el periodo quedan bloqueadas.')]));
body.push(H2('Fuente de datos y sincronización (conectores)'));
S([T('Cada concepto declara su '), B('fuente de datos'), T('. Hoy la captura es manual; en una '), B('fase posterior'), T(' cada fuente externa se sincroniza automáticamente (tal como la descarga del checador Hikvision está simulada hoy y en producción usa ISAPI/SDK). La columna '), B('Origen'), T(' de cada captura indica de dónde provino.')]);
body.push(table(['Fuente', 'Alimenta', 'Origen en producción (fase posterior)'], [['G3', 'Kilometraje del conductor', 'Telemetría de flotilla (G3 Drive)'], ['MES', 'm² de costura en fabricación', 'Plataforma MES (órdenes de producción)'], ['Aspel', 'Base de comisión de ventas', 'Aspel (CxC/SAE) al confirmarse el pago de facturas']], [1500, 3200, 3500]));
S([T('Los botones '), B('⟳ G3'), T(', '), B('⟳ MES'), T(' y '), B('⟳ Aspel'), T(' del encabezado ejecutan la sincronización (hoy en modo simulado). La sincronización hace actualización por identificador externo: re-sincronizar actualiza las capturas de esa fuente sin duplicarlas, y no toca las capturas manuales.')]);

body.push(pageBreak(), H1('10. Empleados'));
S([B('Propósito. '), T('Catálogo del personal, con su relación (clave) en Aspel NOI y su identificador en el checador.')]);
body.push(...image('07-empleados.png', { caption: 'Catálogo de empleados', maxH: 620 }));
body.push(...image('13-modal-empleado.png', { caption: 'Alta / edición de empleado', maxH: 560 }));
body.push(callout([B('Mapeo con NOI: '), T('la '), B('Clave NOI'), T(' es la clave con la que el trabajador opera en Aspel NOI; el '), B('ID en checador'), T(' es el número de persona en el dispositivo Hikvision.')]));

body.push(pageBreak(), H1('11. Horarios y reglas'));
S([B('Propósito. '), T('Definir los turnos (horarios) y las reglas globales que rigen el cálculo de asistencia.')]);
body.push(...image('08-horarios-reglas.png', { caption: 'Turnos y reglas operativas' }));
body.push(table(['Parámetro', 'Descripción'], [['Umbral tiempo extra (min)', 'Minutos después de la salida para empezar a contar tiempo extra.'], ['Bloque mínimo T. Extra (min)', 'Duración mínima para considerar el tiempo extra.'], ['Salida anticipada (min)', 'Margen para marcar salida anticipada.'], ['Retardos máx. para bono', 'Retardos permitidos en el periodo sin perder el bono.'], ['Faltas permitidas para bono', 'Faltas injustificadas permitidas para conservar el bono.'], ['Importe del bono', 'Monto del bono de puntualidad y asistencia.']], [3600, 5800]));

body.push(pageBreak(), H1('12. Checador'));
S([B('Propósito. '), T('Consultar el dispositivo Hikvision, sincronizar las checadas y revisar los registros descargados.')]);
body.push(...image('09-checador.png', { caption: 'Dispositivo y registros del checador' }));
body.push(step(1, 'Indique el rango de fechas (Desde / Hasta).'));
body.push(step(2, [T('Presione '), B('Sincronizar checadas'), T('. Se descargan y procesan las checadas del rango.')]));
body.push(callout([B('Nota técnica: '), T('en producción la sincronización consulta el dispositivo Hikvision vía ISAPI/SDK. En esta versión de demostración las checadas se generan de forma simulada.')]));

body.push(pageBreak(), H1('13. Kiosco y reconocimiento facial'));
S([B('Propósito. '), T('Pantalla que ve el colaborador al registrar su entrada/salida por '), B('reconocimiento facial con la cámara frontal de una tablet o una webcam'), T('. El reconocimiento se ejecuta en el navegador, de forma local y sin servicios externos.')]);
body.push(...image('20-kiosco-camara.png', { caption: 'Kiosco de acceso con cámara en vivo' }));
body.push(H2('Enrolamiento del rostro (una vez por empleado)'));
S([T('En '), B('Empleados'), T(', la columna '), B('Biometría'), T(' indica el estado. Para registrar el rostro:')]);
body.push(step(1, [T('En la fila del empleado, presione '), B('📷 Registrar'), T('.')]));
body.push(step(2, 'Permita el acceso a la cámara y encuadre el rostro, bien iluminado y de frente.'));
body.push(step(3, [T('Presione '), B('Capturar rostro'), T(' y luego '), B('Guardar registro'), T('. Se genera una plantilla facial (128 valores) que se guarda en el empleado.')]));
body.push(...image('19-enrolamiento.png', { caption: 'Registro biométrico del rostro del empleado', maxH: 520 }));
body.push(H2('Registro de acceso en el kiosco'));
S([T('Abra el kiosco desde '), B('Checador → Abrir modo kiosco'), T(' o en la dirección '), B('/kiosk'), T('. El colaborador se coloca frente a la cámara; el sistema identifica el rostro contra los enrolados y registra automáticamente la '), B('entrada'), T(' o '), B('salida'), T(', mostrando la confirmación con nombre, hora y estatus.')]);
body.push(...image('17-kiosco-confirmacion.png', { caption: 'Confirmación que ve el empleado al registrar su acceso', maxH: 520 }));
body.push(callout([B('Respaldo: '), T('si la cámara no está disponible, el kiosco ofrece un registro manual por selección de nombre.')]));
body.push(callout([B('Requisito técnico: '), T('la cámara del navegador funciona en localhost o sobre HTTPS. Para una tablet en red local, sirva la plataforma por HTTPS.')], true));

body.push(pageBreak(), H1('14. Usuarios'));
S([B('Propósito. '), T('Administrar los usuarios de la plataforma (sólo Administrador): alta, edición, rol y activación.')]);
body.push(...image('10-usuarios.png', { caption: 'Usuarios administrativos' }));
body.push(callout([T('El plan Renta Operativa contempla '), B('hasta 5 usuarios administrativos'), T(' activos.')]));

body.push(pageBreak(), H1('15. Bitácora'));
S([B('Propósito. '), T('Trazabilidad de todas las operaciones: quién hizo qué, cuándo y con qué detalle/motivo.')]);
body.push(...image('11-bitacora.png', { caption: 'Bitácora de trazabilidad' }));
S('Puede filtrarse por entidad. Registra altas, correcciones, autorizaciones, rechazos, sincronizaciones, cierres y exportaciones.');

body.push(pageBreak(), H1('16. Recursos Humanos (RH)'));
S([B('Propósito. '), T('Módulos administrativos de RH (grupo Recursos Humanos en la barra lateral): indicadores, recibos preliminares, saldos de vacaciones y tickets.')]);
body.push(H2('Indicadores RH'));
S('Tablero con % de asistencia, puntualidad y ausentismo, tiempo extra, empleados elegibles a bono, asistencia por área, top de retardos y pendientes por autorizar.');
body.push(...image('21-rh-indicadores.png', { caption: 'Indicadores de Recursos Humanos' }));
body.push(H2('Recibos'));
S([T('Genera '), B('recibos preliminares'), T(' del periodo a partir de la asistencia, incidencias, tiempo extra y bono (percepciones, deducciones y neto); cada recibo puede consultarse y descargarse.')]);
body.push(...image('24-recibo-detalle.png', { caption: 'Detalle de un recibo preliminar', maxH: 520 }));
body.push(callout([B('Importante: '), T('los recibos son preliminares/informativos. El cálculo fiscal definitivo (ISR/IMSS) se realiza en Aspel NOI.')], true));
body.push(H2('Vacaciones (saldos) y Tickets'));
S('Los saldos de vacaciones se calculan conforme a la Ley Federal del Trabajo (reforma 2023) según la antigüedad. La bandeja de tickets permite a RH responder y cambiar el estado (abierto, en proceso, resuelto).');
body.push(...image('23-rh-vacaciones.png', { caption: 'Saldos de vacaciones' }));

body.push(pageBreak(), H1('17. Portal del empleado'));
S([B('Propósito. '), T('Autoservicio del colaborador. Se accede desde la pantalla de inicio eligiendo '), B('Empleado'), T(' e ingresando su '), B('código y PIN'), T('.')]);
body.push(...image('26-portal-asistencia.png', { caption: 'Mi asistencia (portal del empleado)' }));
body.push(H2('Funciones del portal'));
body.push(bullet([B('Mi asistencia: '), T('indicadores y detalle diario del periodo (sólo su propia información).')]));
body.push(bullet([B('Vacaciones y permisos: '), T('saldo y solicitud de vacaciones/permisos, que quedan pendientes hasta su autorización.')]));
body.push(bullet([B('Mis recibos: '), T('consulta y descarga de los recibos emitidos.')]));
body.push(bullet([B('Mis tickets: '), T('apertura y seguimiento de solicitudes a Recursos Humanos.')]));
body.push(callout([T('El portal del empleado corresponde a la '), B('etapa siguiente'), T(' de la propuesta (crecimiento por módulos).')]));

body.push(pageBreak(), H1('18. Referencia: motor de reglas'));
S('Para cada empleado y día, el sistema determina el estatus así:');
body.push(step(1, 'Si hay una incidencia autorizada que cubre el día, ese es el estatus.'));
body.push(step(2, 'Si no es día laborable del horario → Descanso.'));
body.push(step(3, 'Sin checadas en día laborable → Falta. Una sola checada → Omisión.'));
body.push(step(4, [T('Entrada dentro de tolerancia → '), B('Asistencia'), T('; hasta el umbral → '), B('Retardo'), T('; más allá → '), B('Falta'), T('.')]));
body.push(step(5, 'El tiempo extra son los minutos tras la salida programada (con umbral y bloque mínimo).'));
S([B('Bono de puntualidad. '), T('Se conserva si no se exceden los retardos permitidos ni hay faltas injustificadas u omisiones.')]);

body.push(pageBreak(), H1('19. Preguntas frecuentes'));
body.push(table(['Situación', 'Solución'], [['No veo las checadas de un empleado', 'Verifique checador e ID asignados y sincronice el rango correcto.'], ['Un día aparece como Falta pero asistió', 'Si sólo hay una checada será Omisión. Corrija con motivo o registre la incidencia.'], ['No puedo autorizar una incidencia', 'La autorización corresponde al Contador general o al Administrador.'], ['No me deja exportar a NOI', 'Hay pendientes por autorizar. Autorícelos o fuerce la exportación al confirmar.'], ['No puedo corregir un día', 'El periodo probablemente está cerrado; un Contador/Administrador puede reabrirlo.']], [3600, 5800]));
body.push(H2('Glosario'));
body.push(table(['Término', 'Definición'], [['Checada', 'Registro de entrada o salida capturado por el checador.'], ['Tolerancia', 'Minutos de gracia tras la entrada antes de contar retardo.'], ['Omisión', 'Día con una sola checada.'], ['Movimiento NOI', 'Concepto consolidado que se exporta a Aspel NOI.'], ['Bitácora', 'Registro de auditoría de todas las operaciones.']], [2800, 6600]));
body.push(new Paragraph({ spacing: { before: 500 }, alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 8, color: RED, space: 12 } }, children: [new TextRun({ text: 'Mallatex · Plataforma de Asistencia · Aspel NOI', bold: true, color: BLACK, size: 20 }), new TextRun({ text: '   ·   powered by ', color: GRAY, size: 20 }), new TextRun({ text: 'Evorgyn', bold: true, color: BLACK, size: 20 })] }));

const doc = new Document({
  creator: 'Evorgyn', title: 'Manual de Usuario — Mallatex Plataforma de Asistencia',
  styles: { default: { document: { run: { font: 'Calibri', color: INK } } }, paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, color: RED, size: 30 } }, { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, color: BLACK, size: 24 } }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Mallatex · Plataforma de Asistencia (Aspel NOI)', color: 'B9B2B1', size: 15 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'ECE8E8', space: 6 } }, children: [new TextRun({ text: 'powered by Evorgyn   ·   ', color: 'B9B2B1', size: 15 }), new TextRun({ children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES], color: 'B9B2B1', size: 15 })] })] }) },
    children: body,
  }],
});
Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, 'docs', 'Manual_Mallatex_Plataforma_Asistencia.docx');
  fs.writeFileSync(out, buf);
  console.log('DOCX generado:', out, '(' + Math.round(buf.length / 1024) + ' KB)');
});
