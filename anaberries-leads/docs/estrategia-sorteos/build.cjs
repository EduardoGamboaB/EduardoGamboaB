/* Generador del documento "Estrategia de Sorteos" para el staff de Mallatex
 * (HTML optimizado para impresión/PDF, con identidad de marca).
 * Uso:  node docs/estrategia-sorteos/build.cjs   → docs/estrategia-sorteos/estrategia.html
 * El PDF se produce con Chromium (ver README del manual, mismo procedimiento). */
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname; // docs/estrategia-sorteos
const SHOTS = '../screenshots'; // relativo al HTML

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const parts = [];
const w = (s) => parts.push(s);
const h1 = (n, t) => w(`<h1 id="s${n}"><span class="num">${n}</span> ${esc(t)}</h1>`);
const h2 = (t) => w(`<h2>${esc(t)}</h2>`);
const p = (html) => w(`<p>${html}</p>`);
const ul = (items) => w('<ul>' + items.map((i) => `<li>${i}</li>`).join('') + '</ul>');
const ol = (items) => w('<ol>' + items.map((i) => `<li>${i}</li>`).join('') + '</ol>');
const note = (html, warn) => w(`<div class="note ${warn ? 'warn' : ''}">${html}</div>`);
const tip = (html) => w(`<div class="note ok">${html}</div>`);
const img = (file, cap, cls = '') => w(`<figure class="${cls}"><img src="${SHOTS}/${file}"/>${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure>`);
const B = (t) => `<b>${esc(t)}</b>`;
const table = (headers, rows) => w(`<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
const sec = () => w('<div class="page-break"></div>');

// ---------- Portada ----------
w(`<section class="cover">
  <img class="cover-imago" src="../manual-assets/mallatex-logo.png"/>
  <div class="cover-sub">Captura de Leads · Evento Anaberries</div>
  <div class="cover-title">ESTRATEGIA DE SORTEOS</div>
  <div class="cover-desc">Guía estratégica para el personal de Mallatex: cómo planear, ejecutar y dar seguimiento a los sorteos del stand para maximizar leads de calidad con transparencia y cumplimiento legal.</div>
  <div class="cover-meta">Versión 1.0 · Julio 2026 · Uso interno</div>
  <div class="cover-foot">Mallatex · <b>Protegemos lo que siembras</b></div>
</section>`);
sec();

// ---------- Contenido ----------
const toc = [
  '1. Propósito y objetivos', '2. Principios rectores', '3. Ciclo de vida de un sorteo',
  '4. Definición del premio y la mecánica', '5. Reglas de elegibilidad y participación',
  '6. Estrategia multi-evento', '7. Ejecución del sorteo', '8. Contacto al ganador y folio',
  '9. Cierre del evento e histórico', '10. Indicadores de éxito (KPIs)',
  '11. Cumplimiento legal y datos personales', '12. Roles del staff',
  '13. Contingencias', '14. Checklist por evento',
];
w('<h1 class="toc-title">Contenido</h1><nav class="toc">' + toc.map((t) => `<div class="toc-item"><span>${esc(t)}</span></div>`).join('') + '</nav>');
sec();

// ---------- 1. Propósito ----------
h1(1, 'Propósito y objetivos');
p(`El sorteo es la ${B('herramienta de atracción')} del stand: convierte el interés del visitante en un ${B('lead de calidad')} a cambio de la oportunidad de ganar un premio. Esta estrategia define cómo operarlo para que sea ${B('atractivo, justo, legal y medible')}.`);
h2('Objetivos');
ul([
  `${B('Captar el mayor número de leads de calidad')} (con correo y celular válidos) durante el evento.`,
  `Generar ${B('valor comercial')}: cada registro alimenta el seguimiento de ventas de Mallatex.`,
  `Ofrecer una experiencia ${B('transparente y confiable')} que refuerce la marca «Protegemos lo que siembras».`,
  `Garantizar el ${B('cumplimiento')} del Aviso de Privacidad y la protección de datos personales.`,
]);
note(`${B('Idea clave:')} el premio no es el fin, es el ${B('incentivo')}. El fin es un padrón de contactos reales a quienes dar seguimiento comercial.`);
sec();

// ---------- 2. Principios ----------
h1(2, 'Principios rectores');
table(['Principio', 'Qué significa en la práctica'], [
  [`${B('Transparencia')}`, 'La mecánica, el premio y la fecha del sorteo se publican por adelantado en la landing y en los Términos y Condiciones.'],
  [`${B('Equidad')}`, 'El ganador se elige al azar entre los participantes elegibles; el sistema registra el resultado y lo conserva en el historial.'],
  [`${B('Datos de calidad')}`, 'Solo participan registros con contacto válido; el correo debe ser empresarial y el celular de 10 dígitos.'],
  [`${B('Cumplimiento')}`, 'Todo registro requiere aceptar Términos y Aviso de Privacidad. Los datos se usan conforme a lo informado.'],
  [`${B('Trazabilidad')}`, 'Cada ganador queda con un folio único y el evento se archiva con su resultado para auditoría.'],
]);
sec();

// ---------- 3. Ciclo de vida ----------
h1(3, 'Ciclo de vida de un sorteo');
p(`Cada evento sigue el mismo flujo de principio a fin:`);
ol([
  `${B('Planear')} — crear el evento, definir premio, mecánica, fecha/hora y plazo de contacto.`,
  `${B('Publicar')} — imprimir y colocar el QR del evento en el stand.`,
  `${B('Captar')} — los visitantes se autoregistran por QR; el staff registra a quien no pueda.`,
  `${B('Sortear')} — en el horario anunciado, elegir el ganador al azar entre los elegibles.`,
  `${B('Contactar')} — el ganador recibe su folio por correo; se le contacta dentro del plazo definido.`,
  `${B('Cerrar')} — finalizar el evento; pasa al histórico con su ganador.`,
]);
tip(`${B('Regla de oro:')} un evento = un premio = un QR = un ganador. No mezcles registros de eventos distintos.`);
sec();

// ---------- 4. Premio y mecánica ----------
h1(4, 'Definición del premio y la mecánica');
p(`En la pestaña ${B('⚙️ Evento')} se configura todo lo que verá el visitante. Al guardar, la ${B('landing')} y los ${B('Términos y Condiciones')} se actualizan solos.`);
h2('Qué definir para cada sorteo');
ul([
  `${B('Premio')} e ${B('imagen')} — atractivos y relacionados con el giro (p. ej. rollo de malla antigranizo).`,
  `${B('Mecánica/dinámica')} — frase clara: «Regístrate y participa; el ganador se elige al azar el <i>día/hora</i>».`,
  `${B('Fecha y hora del sorteo')} — momento en que se ejecuta ante el público.`,
  `${B('Plazo para contactar al ganador')} — días hábiles para reclamar el premio (p. ej. 5 días).`,
  `${B('Sede/lugar')} y ${B('edición/año')} del evento.`,
]);
img('17-evento-admin.png', 'Configuración del evento: premio, imagen, fecha y mecánica.');
note(`${B('Buena práctica:')} define un premio ${B('deseable pero coherente')} con el cliente objetivo (agricultores/empresas), para atraer leads relevantes y no “cazadores de premios”.`);
sec();

// ---------- 5. Elegibilidad ----------
h1(5, 'Reglas de elegibilidad y participación');
h2('Requisitos para participar');
ul([
  `${B('Un registro por persona')} — el sistema detecta duplicados por correo o celular y no los cuenta doble.`,
  `${B('Contacto válido')} — celular de exactamente ${B('10 dígitos')} y ${B('correo empresarial válido')}; por ahí se contacta al ganador.`,
  `${B('Aceptación obligatoria')} de Términos y Condiciones y Aviso de Privacidad.`,
  `Opcional en el sorteo: ${B('Solo con consentimiento')} (participan quienes aceptaron recibir información comercial).`,
]);
note(`${B('Por qué el correo empresarial y el celular reales importan:')} si el ganador no puede ser contactado, el premio no se entrega y se pierde la confianza. Verifica ambos datos en voz alta al registrar.`, true);
h2('Quién queda fuera');
ul([
  'Registros sin ningún medio de contacto válido.',
  'Duplicados del mismo participante.',
  `Según la configuración del evento, ${B('ganadores de otros eventos')} (ver estrategia multi-evento).`,
]);
img('19-landing-premio-movil.png', 'La landing muestra el premio y el aviso de contacto al ganador.', 'phone');
sec();

// ---------- 6. Multi-evento ----------
h1(6, 'Estrategia multi-evento');
p(`La plataforma admite ${B('varios eventos')}, cada uno con su propio ${B('premio, QR y padrón de participantes')}. Esto permite operar expos distintas o etapas sin mezclar datos.`);
h2('QR por evento');
p(`Cada evento genera su propio código en ${B('/qr?e=&lt;id&gt;')}. Imprime y coloca el QR ${B('del evento activo')}; los registros entran al evento correcto automáticamente.`);
w('<div class="row2">');
img('20-evento-multi.png', 'Lista de eventos, cada uno con su configuración.');
img('22-qr-evento.png', 'QR específico del evento para imprimir.');
w('</div>');
h2('¿Puede un ganador de un evento participar en otro?');
p(`Al configurar el evento se decide con la opción ${B('«¿Los ganadores de otros eventos pueden participar?»')}:`);
table(['Opción', 'Efecto', 'Cuándo usarla'], [
  [`${B('Sí (permitir)')}`, 'Todos participan, incluso quien ya ganó en otro evento.', 'Eventos independientes o públicos distintos.'],
  [`${B('No (excluir)')}`, 'Quien ya ganó en otro evento no entra al sorteo.', 'Campañas ligadas donde se busca repartir premios entre más personas.'],
]);
tip(`Define esta política ${B('antes de abrir el registro')} y comunícala en la mecánica para evitar confusiones.`);
sec();

// ---------- 7. Ejecución ----------
h1(7, 'Ejecución del sorteo');
p(`En la pestaña ${B('🎁 Sorteo')} se ejecuta ante el público en el horario anunciado.`);
ol([
  'Selecciona el <b>evento activo</b> del que se sortea.',
  'Confirma el <b>premio</b> y las opciones (<b>Solo con consentimiento</b>, <b>Evitar ganadores repetidos</b>).',
  'Verifica el número de <b>participantes elegibles</b> a la vista de todos.',
  'Presiona <b>Iniciar sorteo</b>; tras la animación se anuncia el ganador.',
  'Anuncia el nombre en voz alta y toma nota; el resultado queda guardado.',
]);
w('<div class="row2">');
img('05-sorteo.png', 'Selección de evento y configuración del sorteo.');
img('06-sorteo-ganador.png', 'Ganador anunciado y registrado.');
w('</div>');
note(`El sorteo es ${B('aleatorio')} entre los elegibles. Hazlo ${B('en público')} y en el horario prometido: es el momento de mayor visibilidad de la marca.`);
sec();

// ---------- 8. Folio ----------
h1(8, 'Contacto al ganador y folio');
p(`Al elegir al ganador, el sistema genera un ${B('folio único')} (formato ${B('ANB-XXXXXX')}) y, si el correo está configurado, envía un ${B('correo de notificación')} con ese folio. El ganador ${B('presenta el folio')} para reclamar el premio.`);
h2('Flujo de contacto');
ol([
  'El ganador recibe el correo con su <b>folio</b>, el premio y el nombre del evento.',
  'El staff contacta al ganador por <b>correo o celular</b> dentro del <b>plazo definido</b> en el evento.',
  'Al entregar el premio, se <b>verifica el folio</b> contra el historial de ganadores.',
]);
img('21-sorteo-folio.png', 'Ganador con su folio; el correo de aviso se envía automáticamente.', 'narrow');
note(`Si el correo automático no está configurado o falla, ${B('entrega el folio manualmente')} y déjalo registrado. El folio también aparece en la app junto al ganador.`, true);
tip(`Si un sorteo debe repetirse (ganador ausente o no localizable en el plazo), puedes ${B('anular')} el resultado desde la lista de ganadores y volver a sortear.`);
sec();

// ---------- 9. Cierre ----------
h1(9, 'Cierre del evento e histórico');
p(`Cuando el evento termina, márcalo como ${B('finalizado')}. Pasa al ${B('histórico')}, donde se conserva el ${B('detalle del evento y su ganador')} para consulta y auditoría.`);
ul([
  `El evento finalizado ${B('deja de recibir registros')} y ya no aparece como activo para sortear.`,
  `El ${B('histórico')} muestra, por evento: premio, fecha y ${B('ganador con su folio')}.`,
  `Antes de cerrar: ${B('exporta el CSV')} de leads desde el Dashboard para el seguimiento comercial.`,
]);
img('24-sorteo-historico.png', 'Histórico de eventos finalizados con su ganador.');
sec();

// ---------- 10. KPIs ----------
h1(10, 'Indicadores de éxito (KPIs)');
p(`Mide cada evento desde el ${B('📊 Dashboard')} para saber si la estrategia funcionó y mejorar el siguiente.`);
table(['Indicador', 'Qué evalúa', 'Meta sugerida'], [
  [`${B('Leads totales')}`, 'Volumen de registros del evento.', 'Según aforo esperado del stand.'],
  [`${B('% con contacto válido')}`, 'Calidad: correo y celular utilizables.', '≥ 90%'],
  [`${B('Tasa de consentimiento')}`, 'Registros que aceptan seguimiento comercial.', '≥ 70%'],
  [`${B('Leads por captador')}`, 'Desempeño del staff en el respaldo manual.', 'Comparativo interno.'],
  [`${B('Autoregistro vs. staff')}`, 'Qué tanto se usó el QR frente al registro asistido.', 'Mayoría por QR.'],
]);
img('04-dashboard.png', 'Dashboard: indicadores, gráficas y tabla de leads.');
sec();

// ---------- 11. Legal ----------
h1(11, 'Cumplimiento legal y datos personales');
ul([
  `Todo participante ${B('acepta')} los Términos y el ${B('Aviso de Privacidad')} de Mallatex antes de registrarse.`,
  `Los datos se tratan conforme a lo informado (incluye fines de ${B('marketing, promociones y ofertas')} según el Aviso).`,
  `Los titulares pueden ejercer sus derechos ${B('ARCO')} en ${B('info@mallatex.com.mx')}.`,
  `Resguarda la información: no compartas el padrón de leads fuera de los canales autorizados de Mallatex.`,
  `Publica la ${B('mecánica y el plazo')} de contacto; cúmplelos para evitar reclamaciones.`,
]);
note(`El acceso a Sorteo, Dashboard y administración requiere ${B('inicio de sesión')}; solo la captura/registro público queda abierta. Cuida las credenciales del staff.`);
sec();

// ---------- 12. Roles ----------
h1(12, 'Roles del staff');
table(['Rol', 'Responsabilidad en el sorteo'], [
  [`${B('Responsable del stand')}`, 'Configura el evento, decide la política de ganadores, ejecuta el sorteo y valida la entrega del premio.'],
  [`${B('Personal de captura')}`, 'Invita a escanear el QR, registra a quien no pueda y verifica correo y celular de cada lead.'],
  [`${B('Administrador del sistema')}`, 'Gestiona usuarios y accesos; resguarda la información y exporta los datos al cierre.'],
]);
tip(`Ten siempre un ${B('dispositivo del staff')} listo con la app abierta para registrar a quien no pueda escanear el QR.`);
sec();

// ---------- 13. Contingencias ----------
h1(13, 'Contingencias');
table(['Situación', 'Qué hacer'], [
  ['El ganador no está presente', 'Anúncialo, contáctalo por correo/celular dentro del plazo; si no responde, anula y vuelve a sortear.'],
  ['El correo del ganador rebota', 'Contáctalo por celular y entrega el folio manualmente; corrige el dato en el registro.'],
  ['Falla internet en el stand', 'El registro por gafete (OCR) funciona sin conexión; el sorteo y el guardado requieren conexión al servidor.'],
  ['Pocos participantes elegibles', 'Impulsa el QR, registra manualmente y confirma que los contactos sean válidos antes de sortear.'],
  ['Duda sobre un duplicado', 'El sistema avisa; conserva un solo registro por persona para no sesgar el sorteo.'],
]);
sec();

// ---------- 14. Checklist ----------
h1(14, 'Checklist por evento');
h2('Antes de abrir');
ul(['Evento creado: premio, imagen, fecha/hora, plazo de contacto.', 'Política de ganadores previos definida.', 'QR del evento impreso y colocado.', 'Correo de notificación configurado y probado.', 'Mecánica y Aviso de Privacidad publicados.']);
h2('Durante el evento');
ul(['Invitar a escanear el QR.', 'Registrar a quien no pueda y verificar contacto.', 'Vigilar participantes elegibles y KPIs en el Dashboard.']);
h2('En el sorteo');
ul(['Seleccionar el evento activo.', 'Ejecutar en público, en el horario anunciado.', 'Anunciar al ganador y confirmar el envío del folio.']);
h2('Al cierre');
ul(['Contactar al ganador dentro del plazo.', 'Exportar el CSV de leads.', 'Finalizar el evento (pasa al histórico).']);
w(`<div class="end">Mallatex · Evento Anaberries — Estrategia de Sorteos · <b>Protegemos lo que siembras</b></div>`);

// ---------- Documento ----------
const STYLE = `
  :root{ --red:#ED3237; --red2:#9B3234; --black:#232121; --ink:#3f3d3d; --gray:#606062; --line:#d2d3d5; --line2:#eeeef0; }
  *{ box-sizing:border-box; } html,body{ margin:0; }
  body{ font-family:'Segoe UI',system-ui,Arial,sans-serif; color:var(--ink); font-size:12.5px; line-height:1.55; }
  h1{ color:var(--red); font-size:22px; margin:0 0 12px; padding-bottom:8px; border-bottom:2px solid var(--red); }
  h1 .num{ display:inline-grid; place-items:center; width:30px; height:30px; background:var(--red); color:#fff; border-radius:8px; font-size:15px; margin-right:8px; vertical-align:middle; }
  h2{ color:var(--black); font-size:15px; margin:18px 0 7px; }
  p{ margin:0 0 9px; } b{ color:var(--black); }
  ul,ol{ margin:0 0 10px; padding-left:20px; } li{ margin:0 0 5px; }
  .note{ background:#fbf3f3; border-left:3px solid var(--red); padding:9px 12px; border-radius:0 6px 6px 0; margin:8px 0 12px; }
  .note.warn{ background:#fff7e6; border-left-color:#d97706; }
  .note.ok{ background:#f0fdf4; border-left-color:#15803d; }
  table{ width:100%; border-collapse:collapse; margin:6px 0 14px; font-size:11.5px; }
  th{ background:var(--red); color:#fff; text-align:left; padding:7px 10px; font-weight:600; }
  td{ padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  tbody tr:nth-child(even){ background:var(--line2); }
  figure{ margin:10px 0 16px; text-align:center; }
  figure img{ max-width:100%; border:1px solid var(--line); border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,.06); }
  figure.narrow img{ max-width:60%; } figure.phone img{ max-width:230px; }
  figcaption{ color:var(--gray); font-style:italic; font-size:10.5px; margin-top:5px; }
  .row2{ display:flex; gap:12px; align-items:flex-start; }
  .row2 figure{ flex:1; margin:10px 0; }
  .page-break{ page-break-after:always; }
  .cover{ height:975px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .cover-imago{ width:420px; max-width:72%; margin-bottom:30px; }
  .cover-sub{ font-size:18px; color:var(--black); margin-bottom:30px; }
  .cover-title{ font-size:34px; font-weight:800; color:var(--black); border-top:3px solid var(--red); border-bottom:3px solid var(--red); padding:10px 26px; letter-spacing:1px; }
  .cover-desc{ color:var(--gray); font-size:15px; margin-top:26px; max-width:490px; }
  .cover-meta{ margin-top:120px; color:var(--ink); font-size:14px; }
  .cover-foot{ margin-top:6px; color:var(--gray); font-size:14px; } .cover-foot b{ color:var(--red2); }
  .toc-item{ display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px dotted var(--line); font-size:13px; }
  .toc-item span{ color:var(--black); }
  .end{ margin-top:40px; padding-top:14px; border-top:2px solid var(--red); text-align:center; color:var(--gray); font-size:12px; } .end b{ color:var(--red2); }
`;
const HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${parts.join('\n')}</body></html>`;
fs.writeFileSync(path.join(HERE, 'estrategia.html'), HTML);
console.log('Estrategia HTML generada:', path.join(HERE, 'estrategia.html'));
