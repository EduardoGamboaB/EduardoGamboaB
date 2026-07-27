/* Generador del Manual de Usabilidad del Staff (HTML optimizado para impresión/PDF).
 * Uso:  node docs/manual/build.cjs   → escribe docs/manual/manual.html
 * El PDF se produce con Chromium (ver docs/manual/README.md). */
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname; // docs/manual
const SHOTS = '../screenshots'; // relativo a manual.html

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
  <div class="cover-title">MANUAL DEL STAFF</div>
  <div class="cover-desc">Guía de usabilidad para el personal del stand: autoregistro por QR, captura de leads, sorteo y seguimiento.</div>
  <div class="cover-meta">Versión 1.0 · Julio 2026</div>
  <div class="cover-foot">Mallatex · <b>Protegemos lo que siembras</b></div>
</section>`);
sec();

// ---------- Contenido ----------
const toc = [
  '1. Introducción', '2. Preparación antes del evento', '3. Acceso del personal (PIN)',
  '4. Autoregistro del visitante por QR', '5. Registro por el staff (respaldo)',
  '6. El sorteo', '7. Dashboard de seguimiento', '8. Buenas prácticas en el stand',
  '9. Solución de problemas', '10. Checklist rápido',
];
w('<h1 class="toc-title">Contenido</h1><nav class="toc">' + toc.map((t) => `<div class="toc-item"><span>${esc(t)}</span></div>`).join('') + '</nav>');
sec();

// ---------- 1. Introducción ----------
h1(1, 'Introducción');
p(`Esta plataforma permite ${B('capturar los datos de los visitantes (leads)')} del stand de Mallatex en el evento Anaberries, realizar un ${B('sorteo')} de premios entre ellos y dar ${B('seguimiento')} desde un panel. Este manual está dirigido al ${B('personal del stand (staff)')} y explica el uso diario paso a paso.`);
h2('Dos formas de registrar a un visitante');
table(['Forma', 'Quién la usa', 'Cómo'], [
  [`${B('Autoregistro por QR')}`, 'El propio visitante', 'Escanea el código QR del stand con su teléfono y llena sus datos en la landing.'],
  [`${B('Registro por el staff')}`, 'El personal del stand', 'Si el visitante no puede escanear, el staff captura los datos (a mano o tomando foto del gafete).'],
]);
note(`${B('Objetivo:')} que ningún visitante se quede sin registrar. El QR agiliza; el registro por staff es el respaldo.`);
h2('Las tres secciones de la app del staff');
ul([
  `${B('📝 Captura')} — registrar leads manualmente o por foto del gafete.`,
  `${B('🎁 Sorteo')} — elegir un ganador al azar entre los leads.`,
  `${B('📊 Dashboard')} — ver estadísticas, buscar leads y exportar a Excel/CSV.`,
]);
sec();

// ---------- 2. Preparación ----------
h1(2, 'Preparación antes del evento');
ol([
  `${B('Publicar la plataforma')} con una dirección web e ${B('HTTPS')} (candado de seguridad). Es indispensable para que la cámara y el QR funcionen desde los teléfonos.`,
  `${B('Definir el PIN del personal')} que protege el Sorteo y el Dashboard. Compártelo solo con el staff.`,
  `${B('Imprimir el código QR')}: abre la página <b>/qr</b> y usa el botón <b>Imprimir póster</b>. Colócalo visible en el stand.`,
  `${B('Revisar los textos legales')} (Términos y Aviso de Privacidad) con la información de Mallatex.`,
  `${B('Probar un registro')} de principio a fin desde un teléfono antes de abrir el stand.`,
]);
img('14-qr.png', 'Página /qr: código para imprimir y colocar en el stand.', 'narrow');
tip(`${B('Consejo:')} pega el QR a la altura de los ojos y agrega una frase llamativa como “Escanea y participa en el sorteo”.`);
sec();

// ---------- 3. Acceso ----------
h1(3, 'Acceso del personal (PIN)');
p(`La ${B('Captura')} de leads está abierta para agilizar el stand. El ${B('Sorteo')} y el ${B('Dashboard')} piden un ${B('PIN')} para proteger la información.`);
ol([
  'Abre la app del staff en el navegador.',
  'Toca la pestaña <b>Sorteo</b> o <b>Dashboard</b>.',
  'Escribe el <b>PIN</b> y presiona <b>Entrar</b>. Quedará recordado en ese dispositivo.',
]);
img('03-acceso-pin.png', 'Ventana de acceso del personal por PIN.', 'narrow');
note(`Si el PIN se ingresó en un dispositivo compartido, ciérralo al terminar borrando los datos del navegador, o usa un dispositivo exclusivo del staff.`);
sec();

// ---------- 4. Autoregistro QR ----------
h1(4, 'Autoregistro del visitante por QR');
p(`El visitante escanea el QR con la cámara de su teléfono y abre la landing de registro. Es ${B('mobile-first')}: se ve bien en cualquier celular.`);
h2('Qué llena el visitante');
ul([
  'Nombre completo, empresa o rancho.',
  `${B('Celular y correo válidos')} — la landing muestra un aviso de que por ese medio se contactará al ganador.`,
  'Producto de interés.',
  `Aceptación de ${B('Términos y Condiciones')} y ${B('Aviso de Privacidad')} (obligatoria).`,
]);
img('12-landing-movil.png', 'Landing de autoregistro (vista en celular) con el aviso de contacto.', 'phone');
p('Al enviar, el visitante ve una confirmación y queda participando en el sorteo:');
img('13-landing-exito-movil.png', 'Confirmación de registro exitoso.', 'phone');
note(`Si alguien intenta registrarse dos veces con el mismo correo o celular, el sistema lo reconoce y muestra “¡Ya estabas registrado!” sin duplicar.`);
sec();

// ---------- 5. Registro por staff ----------
h1(5, 'Registro por el staff (respaldo)');
p(`Usa esta opción cuando un visitante ${B('no puede escanear el QR')} (sin cámara, sin datos, batería baja, etc.). En la pestaña ${B('📝 Captura')} elige el modo ${B('Manual')} o ${B('Foto del gafete')}.`);
img('01-captura.png', 'Pantalla de Captura con el selector Manual / Foto del gafete.');

h2('5.1 Captura manual');
ol([
  'Selecciona el modo <b>✍️ Manual</b>.',
  'Escribe al menos el <b>nombre</b> y un medio de contacto (celular o correo).',
  'Completa empresa, cargo, producto de interés y notas si aplica.',
  'Escribe tu nombre en <b>Capturado por</b> (queda recordado).',
  'Presiona <b>Guardar lead</b>. Verás la confirmación y el contador aumentará.',
]);
note(`Si el correo o el celular ya existen, el sistema avisa que es un ${B('duplicado')} y te pregunta si deseas guardarlo de todas formas.`);

h2('5.2 Captura por foto del gafete (OCR)');
p(`El sistema puede ${B('leer el gafete')} y llenar los datos automáticamente.`);
ol([
  'Selecciona el modo <b>📷 Foto del gafete</b>.',
  'Toca <b>Abrir cámara</b> y <b>Tomar foto</b>, o usa <b>Subir imagen</b>.',
  'Presiona <b>✨ Extraer datos</b> y espera unos segundos.',
  'El nombre, empresa, correo y teléfono se llenan solos. <b>Revisa y corrige</b> lo necesario.',
  'Completa el producto de interés y presiona <b>Guardar lead</b>.',
]);
w('<div class="row2">');
img('10-gafete-foto.png', 'Foto del gafete lista para extraer.');
img('11-gafete-ocr.png', 'Datos autocompletados por el lector (OCR).');
w('</div>');
tip(`${B('Para una mejor lectura:')} buena luz, gafete plano y encuadrado, sin reflejos ni sombras. El OCR es una ayuda; siempre verifica el correo y el celular antes de guardar.`);
sec();

// ---------- 6. Sorteo ----------
h1(6, 'El sorteo');
p(`En la pestaña ${B('🎁 Sorteo')} eliges un ganador al azar entre los leads capturados.`);
ol([
  'Escribe el <b>premio</b> (ej. “Rollo de malla antigranizo”).',
  'Opcional: activa <b>Solo con consentimiento</b> y/o <b>Evitar ganadores repetidos</b>.',
  'Verifica el número de <b>participantes elegibles</b>.',
  'Presiona <b>Iniciar sorteo</b>. Tras la animación aparece el ganador.',
]);
w('<div class="row2">');
img('05-sorteo.png', 'Configuración del sorteo.');
img('06-sorteo-ganador.png', 'Ganador anunciado y guardado en el historial.');
w('</div>');
note(`El ganador queda en el ${B('historial')} con su premio. Si necesitas repetir un sorteo, puedes ${B('anular')} el resultado desde la lista de ganadores (botón ✕).`);
sec();

// ---------- 7. Dashboard ----------
h1(7, 'Dashboard de seguimiento');
p(`La pestaña ${B('📊 Dashboard')} muestra el avance del stand en tiempo real.`);
ul([
  `${B('Indicadores:')} leads totales, del día, con consentimiento, tasa de consentimiento y ganadores.`,
  `${B('Gráficas:')} por producto de interés, por fuente (incluye “Autoregistro (QR)”), por hora y por captador.`,
  `${B('Tabla de leads:')} búsqueda por nombre/empresa/correo y filtro por producto. El ícono ${B('📷')} abre la foto del gafete.`,
  `${B('Exportar CSV:')} descarga todos los leads para abrirlos en Excel y darles seguimiento comercial.`,
]);
img('04-dashboard.png', 'Dashboard con indicadores, gráficas y tabla de leads.');
sec();

// ---------- 8. Buenas prácticas ----------
h1(8, 'Buenas prácticas en el stand');
ul([
  'Invita a todos a <b>escanear el QR</b>; ten el póster siempre visible.',
  'Ten un <b>dispositivo del staff</b> listo para registrar a quien no pueda escanear.',
  'Confirma en voz alta el <b>correo y el celular</b>: por ahí se contacta al ganador.',
  'Anota el <b>producto de interés</b>; es clave para el seguimiento comercial.',
  'Revisa el <b>Dashboard</b> durante el día para conocer el avance.',
  'Realiza el <b>sorteo</b> en el horario anunciado y comparte al ganador.',
]);
sec();

// ---------- 9. Solución de problemas ----------
h1(9, 'Solución de problemas');
table(['Situación', 'Qué hacer'], [
  ['La cámara no abre', 'Verifica que la página use HTTPS y da permiso de cámara al navegador. Alternativa: usa <b>Subir imagen</b>.'],
  ['El visitante no puede escanear el QR', 'Regístralo tú desde <b>📝 Captura</b> (manual o foto del gafete).'],
  ['El OCR no leyó bien', 'Toma la foto con buena luz y gafete plano; corrige los campos a mano antes de guardar.'],
  ['Dice que el lead está duplicado', 'Es normal si ya se registró. Puedes continuar o descartarlo.'],
  ['No entra al Sorteo/Dashboard', 'Ingresa el <b>PIN</b> del personal. Si lo olvidaste, pídelo al responsable.'],
  ['No hay internet en el stand', 'La captura por gafete (OCR) funciona sin internet; el autoregistro por QR y el guardado requieren conexión al servidor.'],
]);
sec();

// ---------- 10. Checklist ----------
h1(10, 'Checklist rápido');
h2('Antes de abrir');
ul(['QR impreso y colocado.', 'PIN del personal a la mano.', 'Dispositivo del staff con la app abierta y probada.', 'Textos legales revisados.']);
h2('Durante el evento');
ul(['Invitar a escanear el QR.', 'Registrar a quien no pueda escanear.', 'Verificar correo y celular de cada lead.', 'Revisar el Dashboard periódicamente.']);
h2('Al cierre');
ul(['Realizar el sorteo y anunciar al ganador.', 'Exportar el CSV de leads.', 'Respaldar la información del evento.']);
w(`<div class="end">Mallatex · Evento Anaberries — Manual del Staff · <b>Protegemos lo que siembras</b></div>`);

// ---------- Documento ----------
const STYLE = `
  :root{ --red:#ED3237; --red2:#9B3234; --black:#232121; --ink:#3f3d3d; --gray:#606062; --line:#d2d3d5; --line2:#eeeef0; }
  *{ box-sizing:border-box; } html,body{ margin:0; }
  body{ font-family:'Segoe UI',system-ui,Arial,sans-serif; color:var(--ink); font-size:12.5px; line-height:1.55; }
  h1{ color:var(--red); font-size:22px; margin:0 0 12px; padding-bottom:8px; border-bottom:2px solid var(--red); }
  h1 .num{ display:inline-grid; place-items:center; width:30px; height:30px; background:var(--red); color:#fff; border-radius:8px; font-size:15px; margin-right:8px; vertical-align:middle; }
  h1.toc-title{ }
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
  .cover-desc{ color:var(--gray); font-size:15px; margin-top:26px; max-width:470px; }
  .cover-meta{ margin-top:120px; color:var(--ink); font-size:14px; }
  .cover-foot{ margin-top:6px; color:var(--gray); font-size:14px; } .cover-foot b{ color:var(--red2); }
  .toc-item{ display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px dotted var(--line); font-size:13px; }
  .toc-item span{ color:var(--black); }
  .end{ margin-top:40px; padding-top:14px; border-top:2px solid var(--red); text-align:center; color:var(--gray); font-size:12px; } .end b{ color:var(--red2); }
`;
const HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${parts.join('\n')}</body></html>`;
fs.writeFileSync(path.join(HERE, 'manual.html'), HTML);
console.log('Manual HTML generado:', path.join(HERE, 'manual.html'));
