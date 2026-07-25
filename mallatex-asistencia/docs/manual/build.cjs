/* Generador del Manual de Usuario en HTML (optimizado para impresión/PDF).
 * Uso:  node docs/manual/build.cjs   → escribe docs/manual/manual.html
 * El PDF se produce con Chromium (ver docs/manual/README.md). */
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname;                    // docs/manual
const SHOTS = '../screenshots';            // relativo a manual.html
const LOGO = '../manual-assets/logo.png';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const parts = [];
const w = (s) => parts.push(s);
const h1 = (n, t) => w(`<h1 id="s${n}"><span class="num">${n}</span> ${esc(t)}</h1>`);
const h2 = (t) => w(`<h2>${esc(t)}</h2>`);
const p = (html) => w(`<p>${html}</p>`);
const ul = (items) => w('<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>');
const ol = (items) => w('<ol>' + items.map((i) => `<li>${i}</li>`).join('') + '</ol>');
const note = (html, warn) => w(`<div class="note ${warn ? 'warn' : ''}">${html}</div>`);
const img = (file, cap, cls = '') => w(`<figure class="${cls}"><img src="${SHOTS}/${file}"/>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`);
const B = (t) => `<b>${esc(t)}</b>`;
const table = (headers, rows) => w(`<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
const sec = () => w('<div class="page-break"></div>');

w(`<section class="cover">
  <img class="cover-imago" src="../manual-assets/mallatex-logo.png"/>
  <div class="cover-sub">Plataforma de Asistencia · Aspel NOI</div>
  <div class="cover-title">MANUAL DE USUARIO</div>
  <div class="cover-desc">Control de asistencia, incidencias, tiempo extra y exportación a nómina</div>
  <div class="cover-meta">Versión 1.0 · Julio 2026</div>
  <div class="cover-foot">powered by <b>Evorgyn</b></div>
</section>`);
sec();

const toc = ['1. Introducción', '2. Conceptos clave', '3. Acceso al sistema', '4. Interfaz general', '5. Tablero', '6. Revisión de asistencia', '7. Faltas e incidencias', '8. Horas extra', '9. Periodos y NOI', '10. Empleados', '11. Horarios y reglas', '12. Checador', '13. Kiosco y reconocimiento facial', '14. Usuarios', '15. Bitácora', '16. Recursos Humanos (RH)', '17. Portal del empleado', '18. Referencia: motor de reglas', '19. Uso en dispositivos móviles', '20. Preguntas frecuentes', '21. Glosario', '22. Anexo: requisitos e instalación'];
w('<h1 class="toc-title">Contenido</h1><nav class="toc">' + toc.map((t) => `<div class="toc-item"><span>${esc(t)}</span></div>`).join('') + '</nav>');
sec();

h1(1, 'Introducción');
p(`${B('Mallatex · Plataforma de Asistencia')} es el sistema con el que Mallatex controla la asistencia de su personal y prepara la información de nómina. Funciona como una ${B('capa de control entre el checador facial (Hikvision) y Aspel NOI')} —el módulo de nómina del ERP de Aspel—, de modo que la información se ${B('revisa y valida antes')} de generar los movimientos de nómina.`);
note(`${B('Principio clave:')} la plataforma nunca envía registros crudos a Aspel NOI. Consolida sólo la información ya revisada y autorizada del periodo, y cada ajuste queda registrado en la bitácora con usuario, fecha y motivo.`);
h2('¿A quién está dirigido este manual?');
ul([`${B('Responsable de nómina:')} revisión diaria, corrección, incidencias, horas extra y exportación.`, `${B('Contador general:')} autorización de incidencias y tiempo extra, cierre de periodo y catálogos.`, `${B('Administrador:')} configuración, reglas, usuarios y todo lo anterior.`]);
h2('Beneficios');
ul(['Menos captura manual y menos dependencia de hojas firmadas.', 'Mayor precisión: las incidencias pasan por reglas, revisión y validación.', 'Trazabilidad completa de cada ajuste.', 'Cierre de nómina más ágil y una base lista para crecer por módulos.']);
sec();

h1(2, 'Conceptos clave');
h2('Flujo operativo');
p('Toda la operación sigue seis pasos, visibles también en el Tablero:');
table(['#', 'Etapa', 'Descripción'], [['1', 'Captura facial', 'El colaborador registra entrada y salida en el checador.'], ['2', 'Sincronización', 'La plataforma descarga las checadas y aplica horarios y reglas.'], ['3', 'Revisión', 'Nómina visualiza asistencias, retardos, faltas y omisiones.'], ['4', 'Corrección', 'Se clasifican vacaciones, permisos, incidencias y ajustes.'], ['5', 'Autorización', 'Se validan las horas extra y se cierra el periodo.'], ['6', 'Exportación NOI', 'Se genera la información compatible para su carga en Aspel NOI.']]);
h2('Roles y permisos');
table(['Acción', 'Nómina', 'Contador', 'Admin'], [['Ver tablero, asistencia, reportes', '✓', '✓', '✓'], ['Sincronizar checador / reprocesar', '✓', '✓', '✓'], ['Corregir asistencia (con motivo)', '✓', '✓', '✓'], ['Registrar incidencias', '✓', '✓', '✓'], ['Autorizar / rechazar incidencias', '—', '✓', '✓'], ['Autorizar / rechazar horas extra', '✓', '✓', '✓'], ['Cerrar periodo', '✓', '✓', '✓'], ['Reabrir periodo', '—', '✓', '✓'], ['Empleados, horarios, conceptos NOI', '—', '✓', '✓'], ['Reglas globales y usuarios', '—', '—', '✓']]);
h2('Periodos de nómina');
p('El trabajo se organiza por periodos (por ejemplo, quincenas). Un periodo puede estar <b>Abierto</b> (admite cambios) o <b>Cerrado</b> (bloqueado). El periodo activo se elige en la barra superior y determina lo que se muestra en cada pantalla.');
h2('Aspel NOI');
p('Aspel NOI es el módulo de nómina del ERP de Aspel. La plataforma genera un archivo de interfaz con los movimientos del periodo, mapeados a los conceptos de NOI del cliente, listo para su carga.');
sec();

h1(3, 'Acceso al sistema');
img('01-login.png', 'Pantalla de acceso');
h2('Iniciar sesión');
ol([`Abra la plataforma en su navegador (por ejemplo ${B('http://localhost:3000')}).`, 'Escriba su correo y contraseña.', `Presione ${B('Entrar')}. Será dirigido al Tablero.`]);
p(`Los botones de ${B('Cuentas demo')} (Administrador, Contador general, Nómina) rellenan las credenciales de prueba automáticamente.`);
h2('Cuentas y roles de demostración');
table(['Rol', 'Correo', 'Contraseña'], [['Administrador', 'admin@mallatex.mx', 'mallatex2026'], ['Contador general', 'contabilidad@mallatex.mx', 'mallatex2026'], ['Responsable de nómina', 'nomina@mallatex.mx', 'mallatex2026']]);
note(`${B('Cerrar sesión:')} use el ícono de encendido (⏻) en la esquina superior derecha, junto a su nombre.`);
sec();

h1(4, 'Interfaz general');
h2('Barra lateral (navegación)');
p('Agrupa los módulos en cuatro secciones. Las opciones visibles dependen de su rol.');
ul([`${B('Operación:')} Tablero, Revisión de asistencia, Faltas e incidencias, Horas extra.`, `${B('Nómina:')} Periodos y NOI.`, `${B('Catálogos:')} Empleados, Horarios y reglas, Checador.`, `${B('Administración:')} Usuarios (sólo Administrador) y Bitácora.`]);
p(`Los contadores rojos junto a ${B('Faltas e incidencias')} y ${B('Horas extra')} indican cuántos elementos están pendientes de autorizar.`);
h2('Barra superior');
ul(['Título de la pantalla actual y periodo en curso.', `${B('Selector de Periodo:')} cambia el periodo de trabajo; todas las pantallas se actualizan al periodo elegido.`, 'Identidad del usuario (nombre y rol) y botón para cerrar sesión.']);
sec();

h1(5, 'Tablero');
p(`${B('Propósito.')} Ofrece una vista ejecutiva del periodo: indicadores, distribución de asistencia, estado del checador y pendientes.`);
img('02-tablero.png', 'Tablero principal');
h2('Elementos de la pantalla');
ul([`${B('Indicadores (KPIs):')} empleados activos, asistencias, faltas/omisiones y horas extra autorizadas.`, `${B('Distribución de asistencia:')} barras con el conteo de cada estatus del periodo.`, `${B('Checador:')} modelo del dispositivo y fecha de la última sincronización, con acceso directo.`, `${B('Pendientes por autorizar:')} incidencias, horas extra y empleados elegibles a bono.`, `${B('Flujo operativo:')} recordatorio visual de las seis etapas del proceso.`]);
sec();

h1(6, 'Revisión de asistencia');
p(`${B('Propósito.')} Es la pantalla central de trabajo diario: muestra el estatus calculado de cada empleado por día y permite corregirlo.`);
img('03-revision-asistencia.png', 'Revisión de asistencia diaria');
h2('Filtros disponibles');
ul(['Rango de fechas (Desde / Hasta), Área, Estatus y búsqueda por nombre o clave.']);
h2('Estatus de asistencia');
table(['Estatus', 'Significado'], [['<span class="tag ok">Asistencia</span>', 'Entrada dentro de la tolerancia del turno.'], ['<span class="tag warn">Retardo</span>', 'Entrada después de la tolerancia y hasta el umbral de retardo.'], ['<span class="tag err">Falta</span>', 'Sin checadas en día laborable o retardo mayor al umbral.'], ['<span class="tag warn">Omisión</span>', 'Registró una sola checada (falta entrada o salida).'], ['<span class="tag purple">Vacaciones / Permiso / Incapacidad</span>', 'Proviene de una incidencia autorizada.'], ['<span class="tag gray">Descanso</span>', 'Día no laborable según el horario.']]);
h2('Corregir un registro');
ol([`Presione ${B('Corregir')} en la fila deseada.`, 'Seleccione el nuevo estatus y, si aplica, ajuste los minutos de tiempo extra.', `${B('Escriba el motivo (obligatorio)')} y guarde. El registro se marca como “✎ manual”.`]);
note(`Toda corrección exige un motivo y queda en la ${B('bitácora')}. En un periodo ${B('cerrado')} no se permiten correcciones.`);
h2('Reprocesar reglas');
p(`El botón ${B('Reprocesar reglas')} recalcula la asistencia del rango con las reglas y checadas vigentes, respetando las correcciones manuales.`);
sec();

h1(7, 'Faltas e incidencias');
p(`${B('Propósito.')} Registrar y autorizar vacaciones, permisos, incapacidades, faltas justificadas y días festivos. Una incidencia autorizada tiene prioridad sobre el cálculo automático.`);
img('04-incidencias.png', 'Listado de incidencias');
h2('Tipos de incidencia');
table(['Tipo', 'Uso'], [['Vacaciones', 'Días de vacaciones autorizados.'], ['Permiso con goce', 'Ausencia justificada con goce de sueldo.'], ['Permiso sin goce', 'Ausencia sin goce (deducción).'], ['Incapacidad', 'Incapacidad IMSS.'], ['Falta justificada', 'Falta con justificación aceptada.'], ['Día festivo / Descanso', 'Marca el día como festivo o de descanso.']]);
h2('Registrar una incidencia');
ol([`Presione ${B('+ Nueva incidencia')}.`, 'Elija empleado, tipo, fechas (desde/hasta) y motivo.', `Registre. La incidencia queda en estado ${B('Pendiente')}.`]);
img('12-modal-incidencia.png', 'Alta de una nueva incidencia', 'narrow');
h2('Autorizar o rechazar');
ul([`${B('Autorizar')} (Contador/Administrador): la incidencia se refleja de inmediato en la asistencia del rango.`, `${B('Rechazar:')} solicita un motivo y no afecta la asistencia.`, `${B('Eliminar:')} disponible para incidencias no procesadas.`]);
sec();

h1(8, 'Horas extra');
p(`${B('Propósito.')} Revisar y autorizar el tiempo extra calculado a partir de las checadas. Nada se exporta a NOI sin autorización.`);
img('05-horas-extra.png', 'Autorización de tiempo extra');
h2('Cómo se calcula');
p('El sistema propone el tiempo extra como los minutos trabajados después de la salida programada (sujeto a un umbral y un bloque mínimo configurables). El trabajo en día de descanso se contabiliza como tiempo extra.');
h2('Autorizar tiempo extra');
ol(['Filtre por estado (Pendientes) y por rango de fechas.', `Ajuste, si es necesario, las ${B('horas a autorizar')} y el ${B('tipo')} (Ordinario o Doble/Triple).`, `Presione ${B('Autorizar')} (o ${B('Rechazar')}). El registro queda validado y con responsable.`]);
sec();

h1(9, 'Periodos y NOI');
p(`${B('Propósito.')} Consolidar el periodo, revisar el resumen por empleado, generar los movimientos para Aspel NOI, exportarlos y cerrar el periodo.`);
img('06-periodos-noi.png', 'Resumen del periodo, movimientos NOI y conceptos', 'tall');
h2('Secciones');
ul([`${B('Encabezado del periodo:')} estado, fechas y botones de Cerrar/Reabrir y + Periodo. Muestra una alerta con los pendientes por autorizar.`, `${B('Resumen por empleado:')} asistencias, retardos, faltas, incidencias, tiempo extra y elegibilidad de bono.`, `${B('Movimientos para NOI:')} cada movimiento con clave, concepto, tipo (Percepción/Deducción/Informativo), cantidad e importe, con total.`, `${B('Conceptos NOI:')} mapeo editable de cada movimiento al número de concepto de Aspel NOI.`]);
h2('Exportar a NOI');
ol(['Verifique que no haya pendientes (la alerta lo indica).', `Presione ${B('Exportar .txt')} o ${B('Exportar .csv')}.`, 'Se descarga el archivo de interfaz listo para cargar en Aspel NOI.']);
note(`Si existen incidencias u horas extra pendientes, la exportación se ${B('bloquea')}; puede forzarse de forma explícita cuando se confirma.`);
h2('Cerrar y reabrir el periodo');
ul([`${B('Cerrar periodo:')} bloquea correcciones. Si hay pendientes, pide confirmación.`, `${B('Reabrir')} (Contador/Administrador): vuelve el periodo a Abierto.`, `${B('+ Periodo:')} crea un nuevo periodo indicando nombre y fechas.`]);
sec();

h2('9.1 Percepciones variables (kilometraje, costura por m², comisiones)');
p(`${B('Propósito.')} Administrar pagos que ${B('no dependen del reloj checador')} sino de una cantidad capturada por periodo: el ${B('bono por kilometraje')} del conductor, la ${B('costura extra por metro cuadrado')} del operador de producción y la ${B('comisión sobre ventas')} del vendedor. Se abre en ${B('Nómina → Percepciones variables')}.`);
img('30-percepciones-variables.png', 'Percepciones variables: capturas del periodo y catálogo de conceptos', 'tall');
h2('Conceptos variables');
p('Cada tipo de pago es un concepto configurable con su número de Aspel NOI y su forma de cálculo:');
table(['Forma de cálculo', 'Cómo se obtiene el importe', 'Ejemplo'], [[`${B('Tarifa por unidad')}`, 'cantidad × tarifa', '640 km × $2.50 = $1,600'], [`${B('Porcentaje sobre base')}`, 'base × (porcentaje ÷ 100)', '$92,000 × 3 % = $2,760'], [`${B('Importe directo')}`, 'se captura el importe ya calculado', '—']]);
p(`Con ${B('+ Concepto')} (Contador/Administrador) se crea un concepto indicando nombre, número NOI, forma de cálculo, unidad (km, m², $ ventas…), tarifa/porcentaje y el área sugerida.`);
h2('Capturar una percepción');
ol([`Con el periodo ${B('Abierto')}, presione ${B('+ Captura')}.`, 'Elija el empleado y el concepto.', `Escriba la ${B('cantidad')} (kilómetros, metros cuadrados o monto de ventas). El importe se calcula en vivo.`, `Opcional: indique una ${B('tarifa o porcentaje distinto')} para ese empleado (excepción puntual); si se deja vacío, se usa la del concepto.`, `Guarde. La captura aparece en la tabla del periodo.`]);
note(`Los importes capturados se ${B('suman a los movimientos calculados por asistencia')} y viajan en la misma exportación a Aspel NOI. Sólo se capturan en periodos ${B('abiertos')}; al cerrar el periodo quedan bloqueadas.`);
h2('Fuente de datos y sincronización (conectores)');
p(`Cada concepto declara su ${B('fuente de datos')}. Hoy la captura es ${B('manual')}; en una ${B('fase posterior')} cada fuente externa se sincroniza automáticamente (tal como la descarga del checador Hikvision está simulada hoy y en producción usa ISAPI/SDK). La columna ${B('Origen')} de cada captura indica de dónde provino (Manual, G3, MES o Aspel).`);
table(['Fuente', 'Alimenta', 'Origen en producción (fase posterior)'], [['G3', 'Kilometraje del conductor', 'Telemetría de flotilla (G3 Drive)'], ['MES', 'm² de costura en fabricación', 'Plataforma MES (órdenes de producción)'], ['Aspel', 'Base de comisión de ventas', 'Aspel (CxC/SAE) al confirmarse el pago de facturas']]);
p(`Los botones ${B('⟳ G3')}, ${B('⟳ MES')} y ${B('⟳ Aspel')} del encabezado ejecutan la sincronización (hoy en modo ${B('simulado')}). La sincronización hace actualización por identificador externo: ${B('re-sincronizar actualiza')} las capturas de esa fuente sin duplicarlas, y no toca las capturas manuales.`);
sec();

h1(10, 'Empleados');
p(`${B('Propósito.')} Catálogo del personal, con su relación (clave) en Aspel NOI y su identificador en el checador.`);
img('07-empleados.png', 'Catálogo de empleados', 'tall');
h2('Acciones');
ul([`${B('+ Empleado:')} da de alta con clave, clave NOI, nombre, RFC, área, puesto, horario, checador, salario diario y elegibilidad de bono.`, `${B('Editar:')} actualiza cualquier dato del empleado.`, `${B('Baja (✕):')} desactiva al empleado sin borrar su historial.`]);
img('13-modal-empleado.png', 'Alta / edición de empleado', 'narrow');
note(`${B('Mapeo con NOI:')} la ${B('Clave NOI')} es la clave con la que el trabajador opera en Aspel NOI; el ${B('ID en checador')} es el número de persona en el dispositivo Hikvision.`);
sec();

h1(11, 'Horarios y reglas');
p(`${B('Propósito.')} Definir los turnos (horarios) y las reglas globales que rigen el cálculo de asistencia.`);
img('08-horarios-reglas.png', 'Turnos y reglas operativas');
h2('Turnos');
p('Cada turno define entrada, salida, comida, tolerancia, umbral de retardo, horas por día y días laborables. Use + Turno para crear uno o Editar para ajustarlo.');
h2('Reglas globales');
table(['Parámetro', 'Descripción'], [['Umbral tiempo extra (min)', 'Minutos después de la salida para empezar a contar tiempo extra.'], ['Bloque mínimo T. Extra (min)', 'Duración mínima para considerar el tiempo extra.'], ['Salida anticipada (min)', 'Margen para marcar salida anticipada.'], ['Retardos máx. para bono', 'Retardos permitidos en el periodo sin perder el bono.'], ['Faltas permitidas para bono', 'Faltas injustificadas permitidas para conservar el bono.'], ['Importe del bono', 'Monto del bono de puntualidad y asistencia.']]);
sec();

h1(12, 'Checador');
p(`${B('Propósito.')} Consultar el dispositivo Hikvision, sincronizar las checadas y revisar los registros descargados.`);
img('09-checador.png', 'Dispositivo y registros del checador');
h2('Sincronización');
ol(['Indique el rango de fechas (Desde / Hasta).', `Presione ${B('Sincronizar checadas')}. Se descargan las checadas del rango y se procesan con las reglas.`]);
p('El listado inferior permite filtrar por empleado y por día, mostrando cada checada con su hora, tipo (entrada/salida), método y origen.');
note(`${B('Nota técnica:')} en producción la sincronización consulta el dispositivo Hikvision vía ISAPI/SDK. En esta versión de demostración las checadas se generan de forma simulada para mostrar el flujo completo sin hardware.`);
sec();

h1(13, 'Kiosco y reconocimiento facial');
p(`${B('Propósito.')} Es la pantalla que ve el colaborador al registrar su entrada/salida por ${B('reconocimiento facial con la cámara frontal de una tablet o una webcam')}. El reconocimiento se ejecuta en el navegador, de forma local y sin servicios externos.`);
img('20-kiosco-camara.png', 'Kiosco de acceso con cámara en vivo');
h2('Enrolamiento del rostro (una vez por empleado)');
p('Antes de usar el kiosco, cada colaborador debe registrar su rostro. En <b>Empleados</b>, la columna <b>Biometría</b> indica el estado (<span class="tag ok">✓ Rostro</span> / <span class="tag gray">Sin registro</span>).');
ol([
  `En la fila del empleado, presione ${B('📷 Registrar')}.`,
  'Permita el acceso a la cámara y encuadre el rostro, bien iluminado y de frente.',
  `Presione ${B('Capturar rostro')} y luego ${B('Guardar registro')}. Se genera una plantilla facial (128 valores) que se guarda en el empleado.`,
]);
img('19-enrolamiento.png', 'Registro biométrico del rostro del empleado', 'narrow');
h2('Registro de acceso en el kiosco');
p(`Abra el kiosco desde ${B('Checador → Abrir modo kiosco')} o en la dirección ${B('/kiosk')} (idealmente en la tablet de recepción).`);
ol([
  'El colaborador se coloca frente a la cámara.',
  'El sistema detecta el rostro, lo compara con los rostros enrolados e identifica al empleado.',
  `Se registra automáticamente la ${B('entrada')} o ${B('salida')} (según la última marca del día) y se muestra la confirmación con nombre, hora y estatus (Puntual / Retardo / Tiempo extra).`,
]);
img('17-kiosco-confirmacion.png', 'Confirmación que ve el empleado al registrar su acceso', 'narrow');
note(`${B('Respaldo:')} si la cámara no está disponible, el kiosco ofrece un ${B('registro manual')} por selección de nombre.`);
note(`${B('Requisito técnico:')} la cámara del navegador funciona en ${B('localhost')} o sobre ${B('HTTPS')}. Para una tablet en red local, sirva la plataforma por HTTPS. La identificación en el checador Hikvision físico seguiría su propio flujo por ISAPI/SDK.`, true);
sec();

h1(14, 'Usuarios');
p(`${B('Propósito.')} Administrar los usuarios de la plataforma (sólo Administrador).`);
img('10-usuarios.png', 'Usuarios administrativos');
ul(['Alta y edición de usuarios con nombre, correo, puesto, rol y contraseña.', 'Activación / desactivación de cuentas.']);
note(`El plan Renta Operativa contempla ${B('hasta 5 usuarios administrativos')} activos.`);
sec();

h1(15, 'Bitácora');
p(`${B('Propósito.')} Trazabilidad de todas las operaciones: quién hizo qué, cuándo y con qué detalle/motivo.`);
img('11-bitacora.png', 'Bitácora de trazabilidad');
p('Puede filtrarse por entidad (asistencia, incidencias, horas extra, periodo, empleado, etc.). Registra altas, correcciones, autorizaciones, rechazos, sincronizaciones, cierres y exportaciones.');
sec();

h1(16, 'Recursos Humanos (RH)');
p(`${B('Propósito.')} Módulos administrativos de RH: indicadores, recibos preliminares, saldos de vacaciones y tickets. Disponibles en el grupo ${B('Recursos Humanos')} de la barra lateral.`);
h2('Indicadores RH');
p('Tablero con % de asistencia, puntualidad y ausentismo, tiempo extra, empleados elegibles a bono, asistencia por área y top de retardos, además de los pendientes por autorizar.');
img('21-rh-indicadores.png', 'Indicadores de Recursos Humanos');
h2('Recibos');
p('Genera <b>recibos preliminares</b> del periodo a partir de la asistencia, incidencias, tiempo extra y bono (percepciones, deducciones y neto). Cada recibo puede consultarse y descargarse.');
ol([`Seleccione el periodo en la barra superior y presione ${B('Generar recibos del periodo')}.`, `Presione ${B('Ver')} en un empleado para el detalle y ${B('Descargar')} para obtener el archivo.`]);
img('24-recibo-detalle.png', 'Detalle de un recibo preliminar', 'narrow');
note(`${B('Importante:')} los recibos son preliminares/informativos. El cálculo fiscal definitivo (ISR/IMSS) se realiza en Aspel NOI.`, true);
h2('Vacaciones (saldos)');
p('Muestra, para toda la plantilla, la antigüedad y los días de vacaciones (derecho, tomados y disponibles) calculados conforme a la Ley Federal del Trabajo (reforma 2023).');
img('23-rh-vacaciones.png', 'Saldos de vacaciones');
h2('Tickets RH');
p('Bandeja de solicitudes de los colaboradores. RH responde, da seguimiento y cambia el estado (abierto, en proceso, resuelto).');
sec();

h1(17, 'Portal del empleado');
p(`${B('Propósito.')} Espacio de autoservicio para el colaborador. Se accede desde la pantalla de inicio eligiendo ${B('Empleado')} e ingresando su ${B('código y PIN')}.`);
img('25-login-empleado.png', 'Acceso del empleado (código + PIN)', 'narrow');
h2('Mi asistencia');
p('El colaborador consulta su asistencia del periodo: indicadores (asistencias, faltas, incidencias, tiempo extra) y el detalle diario. No tiene acceso a información administrativa ni de otros empleados.');
img('26-portal-asistencia.png', 'Mi asistencia (portal del empleado)');
h2('Vacaciones y permisos');
p('Muestra el saldo de vacaciones y permite <b>solicitar</b> vacaciones o permisos. La solicitud queda pendiente hasta que RH/Contabilidad la autorice (aparece en el módulo de incidencias).');
img('27-portal-vacaciones.png', 'Solicitud de vacaciones y permisos', 'narrow');
h2('Mis recibos');
p('Lista los recibos emitidos; el colaborador puede ver el detalle y descargarlos.');
h2('Mis tickets');
p('Permite abrir tickets a Recursos Humanos y dar seguimiento a las respuestas.');
img('29-portal-tickets.png', 'Mis tickets (portal del empleado)', 'narrow');
note(`El portal del empleado corresponde a la ${B('etapa siguiente')} de la propuesta (crecimiento por módulos).`);
sec();

h1(18, 'Referencia: motor de reglas');
p('Para cada empleado y día, el sistema determina el estatus así:');
ol(['Si hay una incidencia autorizada que cubre el día, ese es el estatus (vacaciones, permiso, incapacidad, etc.).', 'Si no es día laborable del horario → Descanso.', 'Sin checadas en día laborable → Falta. Una sola checada → Omisión.', `Con entrada y salida se compara la entrada contra la tolerancia: dentro → ${B('Asistencia')}; pasada la tolerancia y hasta el umbral → ${B('Retardo')}; más allá del umbral → ${B('Falta')}.`, 'El tiempo extra son los minutos tras la salida programada (con umbral y bloque mínimo).']);
p(`${B('Bono de puntualidad.')} Un empleado conserva el bono del periodo si no excede los retardos permitidos, no tiene faltas injustificadas ni omisiones.`);
sec();

h1(19, 'Uso en dispositivos móviles');
p('La plataforma es responsiva. En pantallas pequeñas la barra lateral se oculta y se abre con el botón de menú (☰); los indicadores y tablas se reorganizan en una sola columna.');
img('14-movil-tablero.png', 'Tablero en vista móvil', 'phone');
sec();

h1(20, 'Preguntas frecuentes');
table(['Situación', 'Solución'], [['No veo las checadas de un empleado', 'Verifique que el empleado tenga checador e ID asignados y sincronice el rango de fechas correcto en la pantalla Checador.'], ['Un día aparece como Falta pero el empleado asistió', 'Revise si registró ambas checadas; si sólo hay una será Omisión. Corrija el registro con un motivo, o registre la incidencia correspondiente.'], ['No puedo autorizar una incidencia', 'La autorización de incidencias corresponde al Contador general o al Administrador.'], ['No me deja exportar a NOI', 'Existen incidencias u horas extra pendientes de autorizar. Autorícelas o fuerce la exportación al confirmar.'], ['No puedo corregir un día', 'Probablemente el periodo está cerrado. Un Contador/Administrador puede reabrirlo.'], ['¿Puedo agregar más usuarios?', 'Sí, hasta 5 usuarios administrativos activos en el plan Renta Operativa.']]);
sec();

h1(21, 'Glosario');
table(['Término', 'Definición'], [['Checada', 'Registro de entrada o salida capturado por el checador.'], ['Tolerancia', 'Minutos de gracia tras la hora de entrada antes de contar retardo.'], ['Omisión', 'Día con una sola checada (falta entrada o salida).'], ['Incidencia', 'Evento que justifica o modifica la asistencia (vacaciones, permiso, incapacidad…).'], ['Periodo', 'Intervalo de nómina (por ejemplo, una quincena).'], ['Movimiento NOI', 'Concepto consolidado (percepción/deducción) que se exporta a Aspel NOI.'], ['Bitácora', 'Registro de auditoría de todas las operaciones.']]);
sec();

h1(22, 'Anexo: requisitos e instalación');
p('La plataforma es una aplicación web (Node.js + Express) con una interfaz servida por el propio servidor. No requiere instalación en el equipo del usuario final, sólo un navegador moderno.');
h2('Puesta en marcha (equipo servidor)');
ol(['Requiere Node.js 20 o superior.', `En la carpeta del proyecto: ${B('npm install')} y luego ${B('npm start')}.`, `Abrir ${B('http://localhost:3000')}. En el primer arranque se cargan los datos demostrativos.`]);
p(`${B('Pruebas:')} la aplicación incluye 27 pruebas automatizadas (unitarias y de integración) que se ejecutan con ${B('npm test')}.`);
w('<div class="end">Mallatex · Plataforma de Asistencia · Aspel NOI &nbsp;·&nbsp; powered by <b>Evorgyn</b></div>');

const css = `
  :root{ --red:#ED3237; --black:#232121; --ink:#3f3d3d; --gray:#606062; --line:#d2d3d5; --line2:#eeeef0; }
  *{ box-sizing:border-box; } html,body{ margin:0; }
  body{ font-family:'Segoe UI',system-ui,Arial,sans-serif; color:var(--ink); font-size:12.5px; line-height:1.55; }
  h1{ color:var(--red); font-size:22px; margin:0 0 12px; padding-bottom:8px; border-bottom:2px solid var(--red); }
  h1 .num{ display:inline-grid; place-items:center; width:30px; height:30px; background:var(--red); color:#fff; border-radius:8px; font-size:15px; margin-right:8px; vertical-align:middle; }
  h2{ color:var(--black); font-size:15px; margin:18px 0 7px; }
  p{ margin:0 0 9px; } b{ color:var(--black); }
  ul,ol{ margin:0 0 10px; padding-left:20px; } li{ margin:0 0 4px; }
  .note{ background:#fbf3f3; border-left:3px solid var(--red); padding:9px 12px; border-radius:0 6px 6px 0; margin:8px 0 12px; }
  .note.warn{ background:#fff7e6; border-left-color:#d97706; }
  table{ width:100%; border-collapse:collapse; margin:6px 0 14px; font-size:11.5px; }
  th{ background:var(--red); color:#fff; text-align:left; padding:7px 10px; font-weight:600; }
  td{ padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  tbody tr:nth-child(even){ background:var(--line2); }
  figure{ margin:10px 0 16px; text-align:center; }
  figure img{ max-width:100%; border:1px solid var(--line); border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
  figure.narrow img{ max-width:66%; } figure.tall img{ max-height:820px; } figure.phone img{ max-width:250px; }
  figcaption{ color:var(--gray); font-style:italic; font-size:10.5px; margin-top:5px; }
  .tag{ display:inline-block; padding:1px 8px; border-radius:5px; font-weight:700; font-size:10.5px; }
  .tag.ok{ background:#f0fdf4; color:#15803d; } .tag.warn{ background:#fffbeb; color:#b45309; }
  .tag.err{ background:#fdeced; color:#b91c1c; } .tag.purple{ background:#f5f3ff; color:#6d28d9; } .tag.gray{ background:#f4f4f5; color:#71717a; }
  .page-break{ page-break-after:always; }
  .cover{ height:960px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .cover-logo{ width:120px; height:120px; margin-bottom:20px; }
  .cover-imago{ width:440px; max-width:72%; margin-bottom:30px; }
  .cover-brand{ font-size:46px; font-weight:800; color:var(--red); letter-spacing:2px; }
  .cover-sub{ font-size:18px; color:var(--black); margin-bottom:34px; }
  .cover-title{ font-size:34px; font-weight:800; color:var(--black); border-top:3px solid var(--red); border-bottom:3px solid var(--red); padding:10px 26px; }
  .cover-desc{ color:var(--gray); font-size:15px; margin-top:26px; max-width:460px; }
  .cover-meta{ margin-top:120px; color:var(--ink); font-size:14px; }
  .cover-foot{ margin-top:6px; color:var(--gray); font-size:14px; } .cover-foot b{ color:var(--black); }
  .toc-item{ display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px dotted var(--line); font-size:13px; }
  .toc-item span{ color:var(--black); }
  .end{ margin-top:40px; padding-top:14px; border-top:2px solid var(--red); text-align:center; color:var(--gray); font-size:12px; } .end b{ color:var(--black); }
`;
const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>${parts.join('\n')}</body></html>`;
fs.writeFileSync(path.join(HERE, 'manual.html'), html);
console.log('HTML escrito:', path.join(HERE, 'manual.html'), '(' + Math.round(html.length / 1024) + ' KB)');
