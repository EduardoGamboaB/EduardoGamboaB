/* Generador del "Manual de Uso de la Plataforma" (Mallatex · Sorteos).
 * Uso:  node docs/manual-plataforma/build.cjs   → docs/manual-plataforma/manual.html
 * El PDF se produce con Chromium (ver README del manual del staff, mismo procedimiento). */
const fs = require('node:fs');
const path = require('node:path');
const HERE = __dirname;
const SHOTS = '../screenshots';

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
  <div class="cover-sub">Plataforma de Captura de Leads y Sorteos</div>
  <div class="cover-title">MANUAL DE USO</div>
  <div class="cover-desc">Guía completa de la plataforma «Mallatex · Sorteos»: acceso y sesión, administración de eventos, registro del visitante por QR, captura del staff, sorteo, dashboard y usuarios.</div>
  <div class="cover-meta">Versión 2.0 · Julio 2026 · Uso interno</div>
  <div class="cover-foot">Mallatex · <b>Protegemos lo que siembras</b></div>
</section>`);
sec();

// ---------- Contenido ----------
const toc = [
  '1. Introducción y visión general', '2. Acceso y sesión', '3. Perfil y cierre por inactividad',
  '4. Navegación del panel (menú, logo, móvil)', '5. Administrar eventos (CRUD)',
  '6. Registro del visitante por QR', '7. Captura por el staff', '8. El sorteo',
  '9. Dashboard de seguimiento', '10. Administración de usuarios',
  '11. Buenas prácticas y solución de problemas', '12. Checklist rápido',
];
w('<h1 class="toc-title">Contenido</h1><nav class="toc">' + toc.map((t) => `<div class="toc-item"><span>${esc(t)}</span></div>`).join('') + '</nav>');
sec();

// ---------- 1. Introducción ----------
h1(1, 'Introducción y visión general');
p(`${B('Mallatex · Sorteos')} es la plataforma para ${B('capturar leads')} en los eventos de Mallatex, ${B('realizar sorteos')} de premios entre ellos y dar ${B('seguimiento')} desde un panel. Está pensada para el ${B('personal (staff)')} del stand y para el ${B('visitante')}, que puede autorregistrarse escaneando un código QR.`);
h2('Dos entornos');
table(['Entorno', 'Quién lo usa', 'Acceso'], [
  [`${B('Landing pública')} (/registro)`, 'El visitante del stand', 'Abierta (por QR). No requiere sesión.'],
  [`${B('Panel del personal')} (inicio)`, 'Staff y administradores', 'Requiere iniciar sesión.'],
]);
h2('Qué incluye el panel del personal');
ul([
  `${B('📝 Captura')} — registrar leads a mano o por foto del gafete (OCR).`,
  `${B('🎁 Sorteo')} — elegir un ganador al azar del evento vigente.`,
  `${B('📊 Dashboard')} — indicadores, tabla de leads y exportación a Excel/CSV.`,
  `${B('⚙️ Evento')} — crear y administrar múltiples eventos, cada uno con su QR.`,
  `${B('👥 Usuarios')} — alta y gestión de cuentas (solo administradores).`,
]);
note(`${B('Idea clave:')} el premio es el ${B('incentivo')}; el objetivo es un padrón de ${B('contactos reales')} para el seguimiento comercial de Mallatex.`);
sec();

// ---------- 2. Acceso y sesión ----------
h1(2, 'Acceso y sesión');
h2('2.1 Iniciar sesión');
p(`Todo el panel del personal requiere ${B('iniciar sesión')} con correo y contraseña. Solo la ${B('captura del visitante')} (la landing por QR) queda pública.`);
ol([
  'Abre la dirección de la plataforma en el navegador.',
  'Escribe tu <b>correo</b> y <b>contraseña</b>.',
  'Presiona <b>Entrar</b>.',
]);
img('23-login.png', 'Pantalla de inicio de sesión con la identidad de Mallatex.', 'narrow');

h2('2.2 Primera configuración por NIP (opcional)');
p(`Para el primer arranque, o para recuperar el acceso, existe un ${B('NIP de configuración')}: aparece la opción «primera configuración» en el login solo si el administrador la habilitó. Permite ${B('entrar sin contraseña')} para crear los usuarios reales y, al finalizar, ${B('se desactiva automáticamente')}.`);
note(`El NIP se habilita desde el servidor (variable ${B('SETUP_PIN')}). Una vez creados los usuarios y ${B('finalizada la configuración')}, deja de funcionar.`);
sec();

// ---------- 3. Perfil e inactividad ----------
h1(3, 'Perfil y cierre por inactividad');
h2('3.1 Mi perfil');
p(`Cada usuario puede ver y modificar sus datos. Haz clic en tu ${B('nombre')} (arriba a la derecha) para abrir ${B('Mi perfil')}.`);
ul([
  'Consulta tu <b>nombre</b>, <b>correo</b> y <b>rol</b>.',
  'Edita tu <b>nombre</b> y <b>correo</b>.',
  'Cambia tu <b>contraseña</b> (debes escribir tu contraseña actual para confirmar).',
  'Cierra sesión con <b>Cerrar sesión</b>.',
]);
tip(`También puedes cerrar sesión con el botón ${B('Salir')} de la barra superior.`);

h2('3.2 Cierre por inactividad');
p(`Por seguridad, si dejas la sesión ${B('inactiva')} un tiempo, aparece un aviso «¿Sigues ahí?» con una ${B('cuenta regresiva de 30 segundos')}:`);
ul([
  `Si presionas ${B('Continuar sesión')}, la sesión se mantiene.`,
  `Si ${B('no confirmas')}, la sesión ${B('se cierra automáticamente')} y regresas al login.`,
]);
note(`Útil en dispositivos compartidos del stand: evita que una sesión quede abierta sin vigilancia.`);
sec();

// ---------- 4. Navegación ----------
h1(4, 'Navegación del panel');
ul([
  `Usa las ${B('pestañas')} superiores para moverte entre Captura, Sorteo, Dashboard, Evento y Usuarios.`,
  `El ${B('logo de Mallatex')} siempre te lleva al ${B('primer menú (Captura)')}.`,
  `En ${B('teléfonos')}, las pestañas se agrupan en un ${B('menú ☰ (hamburguesa)')}: tócalo para abrir y elegir la sección. El diseño es ${B('responsivo y adaptativo')}.`,
]);
w('<div class="row2">');
img('27-movil-captura.png', 'Vista en teléfono (captura).', 'phone');
img('28-movil-sorteo.png', 'Vista en teléfono (sorteo).', 'phone');
w('</div>');
sec();

// ---------- 5. Eventos ----------
h1(5, 'Administrar eventos (CRUD)');
p(`En la pestaña ${B('⚙️ Evento')} administras ${B('múltiples eventos')}. Cada uno tiene su propio ${B('código QR')}, premio y padrón de participantes. Al guardar, la ${B('landing')} y los ${B('Términos y Condiciones')} se actualizan con esta información.`);
h2('5.1 Lista y estado de los eventos');
p(`La lista muestra todos los eventos con su ${B('estado')} y acciones por fila:`);
table(['Estado', 'Significado'], [
  [`${B('★ Activo')}`, 'Es el evento predeterminado para captura, sorteo y QR.'],
  [`${B('Vigente')}`, 'Disponible para sortear, pero no es el activo.'],
  [`${B('Finalizado')}`, 'Cerrado; pasa al histórico y ya no aparece para sortear.'],
]);
h2('5.2 Acciones');
ul([
  `${B('Nuevo')} — crea un evento (no roba el «activo» al evento en curso).`,
  `${B('Editar (✏️)')} — carga el evento en el formulario para modificarlo.`,
  `${B('Marcar activo (★)')} — lo vuelve el predeterminado.`,
  `${B('Finalizar (🏁) / Reabrir (↩︎)')} — cierra el evento (pasa al histórico) o lo reabre.`,
  `${B('Ver QR (🔳)')} — abre el póster del código de ese evento.`,
  `${B('Eliminar (🗑)')} — borra el evento (no debe tener leads registrados).`,
]);
h2('5.3 Datos de cada evento');
ul([
  `${B('Nombre')}, ${B('edición/año')} y ${B('tipo/Expo')}.`,
  `${B('Sede')}, ${B('fecha')} y ${B('hora')} del concurso.`,
  `${B('Premio')} e ${B('imagen')} (se muestran en la landing y en los Términos).`,
  `${B('Dinámica/mecánica')} y ${B('días para contactar al ganador')}.`,
  `${B('¿Ganadores de otros eventos pueden participar?')} — política por evento.`,
]);
img('17-evento-admin.png', 'Administrar evento: premio, imagen, fecha y mecánica.');
tip(`${B('Reutilizable:')} para un próximo evento solo crea/actualiza estos campos; no se necesita cambiar la aplicación.`);
sec();

// ---------- 6. Registro del visitante ----------
h1(6, 'Registro del visitante por QR');
p(`El visitante escanea el ${B('QR del evento')} y abre la landing de registro. Es ${B('mobile-first')} y ofrece ${B('dos formas')} de capturar sus datos:`);
h2('6.1 Foto del gafete (opción principal)');
ol([
  'Toca <b>📷 Tomar foto del gafete</b> (modo por defecto).',
  'Abre la cámara y toma la foto, o usa <b>Subir imagen</b>.',
  'Presiona <b>✨ Extraer datos</b>: se llenan nombre, empresa, correo y teléfono.',
  'Revisa y <b>completa tu celular y correo</b> (siempre visibles).',
]);
h2('6.2 Captura manual (opción secundaria)');
p(`Con ${B('✍️ Capturar manual')} el visitante escribe sus datos. La foto del gafete es ${B('opcional')}: si la cámara falla, siempre puede registrarse a mano.`);
w('<div class="row2">');
img('12-landing-movil.png', 'Landing de registro (celular).', 'phone');
img('19-landing-premio-movil.png', 'Landing con el premio del evento.', 'phone');
w('</div>');
h2('6.3 Datos y confirmación');
ul([
  `${B('Correo y celular válidos')} son obligatorios: por ahí se contacta al ganador (correo empresarial; celular de 10 dígitos).`,
  `Se elige el ${B('Estado')} de la República.`,
  `Se aceptan ${B('Términos')} y ${B('Aviso de Privacidad')}.`,
  `Al enviar, el visitante recibe su ${B('folio de registro')} (ANB-XXXXXX) con la nota de que sus datos deben ${B('coincidir con su gafete')}, y se le redirige al sitio oficial de Mallatex.`,
]);
img('13-landing-exito-movil.png', 'Confirmación con el folio de registro.', 'phone');
note(`Si alguien intenta registrarse dos veces con el mismo correo o celular, el sistema lo reconoce y no duplica.`);
sec();

// ---------- 7. Captura por el staff ----------
h1(7, 'Captura por el staff');
p(`Cuando un visitante ${B('no puede escanear el QR')}, el staff lo registra desde la pestaña ${B('📝 Captura')}, en modo ${B('Manual')} o ${B('Foto del gafete')}.`);
ul([
  'Registra al menos el <b>nombre</b> y un medio de contacto (celular o correo).',
  'Completa empresa, <b>Estado</b>, cargo, producto de interés y notas.',
  'Los campos de texto se capturan en <b>MAYÚSCULAS</b> automáticamente (excepto correo y teléfono).',
  'Al guardar, se muestra el <b>folio del lead</b> para leérselo al visitante y la nota de verificar el gafete.',
]);
img('01-captura.png', 'Pantalla de Captura con Manual / Foto del gafete.');
h2('Foto del gafete (OCR)');
p(`El sistema puede ${B('leer el gafete')} y llenar los datos. El OCR corre en el dispositivo (sin conexión). Tras extraer, ${B('revisa y corrige')} siempre el correo y el celular.`);
w('<div class="row2">');
img('10-gafete-foto.png', 'Foto del gafete lista para extraer.');
img('11-gafete-ocr.png', 'Datos autocompletados por el lector (OCR).');
w('</div>');
sec();

// ---------- 8. Sorteo ----------
h1(8, 'El sorteo');
p(`En la pestaña ${B('🎁 Sorteo')} eliges un ganador al azar. ${B('Solo se puede sortear si hay un evento vigente')} (no finalizado); si no lo hay, el botón se deshabilita y se avisa.`);
ol([
  'Selecciona el <b>evento del sorteo</b> (vigente).',
  'Confirma el <b>premio</b> y las opciones (<b>Solo con consentimiento</b>, <b>Evitar ganadores repetidos</b>).',
  'Verifica el número de <b>participantes elegibles</b>.',
  'Presiona <b>Iniciar sorteo</b>. Tras la animación aparece el ganador con su <b>folio</b>.',
]);
w('<div class="row2">');
img('05-sorteo.png', 'Configuración del sorteo por evento.');
img('21-sorteo-folio.png', 'Ganador con su folio; se envía por correo si hay SMTP.');
w('</div>');
ul([
  `El ganador ${B('reutiliza su folio de registro')} (un solo folio por persona) y, si el correo está configurado, recibe una ${B('notificación con el folio')}.`,
  `Los eventos ${B('finalizados')} muestran un ${B('histórico')} con su detalle y su ganador.`,
  `Si el ganador no aparece, puedes ${B('anular')} el sorteo y repetirlo.`,
]);
img('24-sorteo-historico.png', 'Histórico de eventos finalizados con su ganador.', 'narrow');
sec();

// ---------- 9. Dashboard ----------
h1(9, 'Dashboard de seguimiento');
p(`La pestaña ${B('📊 Dashboard')} muestra el avance en tiempo real. Puedes filtrar por evento.`);
ul([
  `${B('Indicadores:')} leads totales, del día, con consentimiento, tasa de consentimiento y ganadores.`,
  `${B('Gráficas:')} por producto de interés, por fuente, por hora y por captador.`,
  `${B('Tabla de leads:')} búsqueda por nombre/empresa/correo, filtro por producto y una columna con el ${B('Evento')} donde se capturó cada lead. El ícono ${B('📷')} abre la foto del gafete.`,
  `${B('Exportar CSV:')} descarga los leads (incluye folio, estado y evento) para Excel y el seguimiento comercial.`,
]);
img('04-dashboard.png', 'Dashboard: indicadores, gráficas y tabla de leads.');
sec();

// ---------- 10. Usuarios ----------
h1(10, 'Administración de usuarios');
p(`Solo los ${B('administradores')} ven la pestaña ${B('👥 Usuarios')}. Desde ahí se crean y gestionan las cuentas del personal.`);
table(['Rol', 'Puede'], [
  [`${B('Administrador')}`, 'Todo: captura, sorteo, dashboard, eventos y gestión de usuarios.'],
  [`${B('Staff')}`, 'Captura, sorteo y dashboard; no administra usuarios.'],
]);
ul([
  `${B('Crear usuario')} con nombre, correo, contraseña (mín. 6) y rol.`,
  `${B('Cambiar contraseña (🔑)')}, ${B('activar/desactivar (⏸/▶)')} y ${B('eliminar (🗑)')} cuentas.`,
  `Cada usuario puede editar sus propios datos en ${B('Mi perfil')}.`,
]);
img('25-usuarios.png', 'Administración de usuarios (solo administradores).');
note(`Siempre debe existir al menos un administrador; el sistema evita quedarte sin acceso.`);
sec();

// ---------- 11. Buenas prácticas / problemas ----------
h1(11, 'Buenas prácticas y solución de problemas');
h2('Buenas prácticas');
ul([
  'Ten el <b>QR del evento activo</b> impreso y visible en el stand.',
  'Ten un <b>dispositivo del staff</b> listo para registrar a quien no pueda escanear.',
  'Confirma en voz alta el <b>correo y el celular</b>: por ahí se contacta al ganador.',
  'Realiza el <b>sorteo</b> en el horario anunciado, con un evento vigente.',
  'Al cierre, <b>exporta el CSV</b> y <b>finaliza</b> el evento.',
]);
h2('Solución de problemas');
table(['Situación', 'Qué hacer'], [
  ['«Correo o contraseña incorrectos»', 'Verifica el correo del usuario. Un administrador puede restablecer la contraseña desde Usuarios.'],
  ['No aparece la pestaña Usuarios', 'Esa pestaña es solo para administradores.'],
  ['No se puede iniciar sorteo', 'Debe haber un evento <b>vigente</b> (no finalizado). Activa o crea uno.'],
  ['La cámara no abre en la landing', 'Usa «Subir imagen» o cambia a «Capturar manual». La foto es opcional.'],
  ['El OCR no leyó bien el gafete', 'Toma la foto con buena luz y gafete plano; corrige los campos antes de guardar.'],
  ['La sesión se cerró sola', 'Fue por inactividad. Vuelve a iniciar sesión; la próxima vez pulsa «Continuar».'],
]);
sec();

// ---------- 12. Checklist ----------
h1(12, 'Checklist rápido');
h2('Antes del evento');
ul(['Evento creado y marcado como activo.', 'Premio, fecha/hora y mecánica configurados.', 'QR del evento impreso y colocado.', 'Usuarios del staff creados.']);
h2('Durante el evento');
ul(['Invitar a escanear el QR.', 'Registrar a quien no pueda (manual o gafete).', 'Verificar correo y celular de cada lead.', 'Vigilar el Dashboard.']);
h2('En el sorteo y cierre');
ul(['Sortear con el evento vigente, en el horario anunciado.', 'Contactar al ganador con su folio.', 'Exportar el CSV de leads.', 'Finalizar el evento (pasa al histórico).']);
w(`<div class="end">Mallatex · Sorteos — Manual de Uso · <b>Protegemos lo que siembras</b></div>`);

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
  .cover-desc{ color:var(--gray); font-size:15px; margin-top:26px; max-width:500px; }
  .cover-meta{ margin-top:120px; color:var(--ink); font-size:14px; }
  .cover-foot{ margin-top:6px; color:var(--gray); font-size:14px; } .cover-foot b{ color:var(--red2); }
  .toc-item{ display:flex; justify-content:space-between; padding:8px 4px; border-bottom:1px dotted var(--line); font-size:13px; }
  .toc-item span{ color:var(--black); }
  .end{ margin-top:40px; padding-top:14px; border-top:2px solid var(--red); text-align:center; color:var(--gray); font-size:12px; } .end b{ color:var(--red2); }
`;
const HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>${parts.join('\n')}</body></html>`;
fs.writeFileSync(path.join(HERE, 'manual.html'), HTML);
console.log('Manual HTML generado:', path.join(HERE, 'manual.html'));
