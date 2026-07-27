# QA — Anaberries · Captura de Leads (Mallatex)

Reporte de aseguramiento de calidad de la aplicación de captura de leads,
sorteo y dashboard para el evento de Anaberries.

- **Fecha:** 2026-07-25
- **Versión:** 1.0.0
- **Entorno de prueba:** Node.js v22, servidor local, almacén JSON temporal.
- **Resultado global:** ✅ **32/32 pruebas automatizadas aprobadas** + validación visual de las pantallas (incluye captura por foto del gafete con OCR y la landing pública de autoregistro por QR).

## 1. Cómo ejecutar las pruebas

```bash
cd anaberries-leads
npm install
npm test        # suite automatizada de API (node --test)
```

La suite (`test/qa.test.js`) arranca el servidor en un puerto y directorio de
datos temporales, ejerce todos los endpoints y limpia al terminar.

## 2. Pruebas automatizadas (API)

| # | Caso | Área | Resultado |
|---|------|------|-----------|
| 1 | `GET /api/health` responde `ok` | Salud | ✅ |
| 2 | `GET /api/access` indica PIN requerido y no autoriza sin él | Acceso | ✅ |
| 3 | `GET /api/access` autoriza con PIN correcto | Acceso | ✅ |
| 4 | `GET /api/leads/meta` expone catálogos de interés y fuente | Captura | ✅ |
| 5 | Crea un lead válido (201) y normaliza el teléfono | Captura | ✅ |
| 6 | Rechaza lead sin nombre (400) | Validación | ✅ |
| 7 | Rechaza lead sin teléfono ni correo (400) | Validación | ✅ |
| 8 | Rechaza correo con formato inválido (400) | Validación | ✅ |
| 9 | Detecta duplicado por teléfono (409) y permite forzar | Captura | ✅ |
| 10 | El listado de leads requiere PIN (401) | Seguridad | ✅ |
| 11 | El listado funciona con PIN y filtra por búsqueda | Dashboard | ✅ |
| 12 | Exporta CSV con cabecera y filas | Dashboard | ✅ |
| 13 | `GET /api/stats` devuelve KPIs y agregados | Dashboard | ✅ |
| 14 | `GET /api/stats` requiere PIN (401) | Seguridad | ✅ |
| 15 | `GET /api/raffle/eligible` cuenta participantes | Sorteo | ✅ |
| 16 | `POST /api/raffle/draw` selecciona ganador y lo registra | Sorteo | ✅ |
| 17 | `POST /api/raffle/draw` sin PIN es rechazado (401) | Seguridad | ✅ |
| 18 | «Evitar repetidos» reduce el pool tras un ganador | Sorteo | ✅ |
| 19 | Anular un sorteo lo elimina del historial | Sorteo | ✅ |
| 20 | Elimina un lead por id | Dashboard | ✅ |
| 21 | Lead por gafete guarda la foto y marca `metodoCaptura` | Gafete/OCR | ✅ |
| 22 | Lead manual no tiene foto (`metodoCaptura` manual, badge 404) | Gafete/OCR | ✅ |
| 23 | Rechaza foto con dataURL inválido (no guarda foto) | Validación | ✅ |
| 24 | Páginas públicas responden HTML (registro, legales, qr) | Landing | ✅ |
| 25 | Autoregistro válido crea lead con fuente y consentimientos | Autoregistro | ✅ |
| 26 | Autoregistro sin aceptar términos/privacidad (400) | Autoregistro | ✅ |
| 27 | Autoregistro con correo inválido (400) | Validación | ✅ |
| 28 | Autoregistro con celular < 10 dígitos (400) | Validación | ✅ |
| 29 | Autoregistro con honeypot lleno (400) | Anti-spam | ✅ |
| 30 | Autoregistro duplicado responde amistoso (200, `yaRegistrado`) | Autoregistro | ✅ |
| 31 | Limitador de tasa del autoregistro devuelve 429 ante ráfagas | Anti-spam | ✅ |
| 32 | Ruta de API inexistente devuelve 404 | Robustez | ✅ |

## 3. Pruebas manuales / visuales (UI)

| Pantalla | Verificación | Evidencia | Resultado |
|----------|--------------|-----------|-----------|
| Landing — móvil | Autoregistro mobile-first, disclaimer, consentimientos | `screenshots/12-landing-movil.png` | ✅ |
| Landing — éxito | Confirmación de registro | `screenshots/13-landing-exito-movil.png` | ✅ |
| Código QR | Página imprimible que apunta a `/registro` | `screenshots/14-qr.png` | ✅ |
| Términos / Aviso | Páginas legales enlazadas desde la landing | `screenshots/15-terminos.png` | ✅ |
| Landing — desktop | Adaptativo en pantalla grande | `screenshots/16-landing-desktop.png` | ✅ |
| Captura (manual) | Selector Manual/Gafete, formulario, catálogos, contador | `screenshots/01-captura.png` | ✅ |
| Gafete — inicial | Modo foto del gafete, cámara/subir imagen | `screenshots/09-gafete-inicial.png` | ✅ |
| Gafete — foto | Foto del gafete cargada, listo para extraer | `screenshots/10-gafete-foto.png` | ✅ |
| Gafete — OCR | Datos extraídos y autocompletados (nombre, empresa, correo, teléfono) | `screenshots/11-gafete-ocr.png` | ✅ |
| Captura (con datos) | Campos, panel «Últimos registros», contador en 12 | `screenshots/02-captura-formulario.png` | ✅ |
| Acceso PIN | Modal de PIN al entrar a zona protegida | `screenshots/03-acceso-pin.png` | ✅ |
| Dashboard | KPIs, 4 gráficas de barras, tabla con búsqueda/filtro | `screenshots/04-dashboard.png` | ✅ |
| Sorteo (inicial) | Configuración de premio, elegibles, historial | `screenshots/05-sorteo.png` | ✅ |
| Sorteo (ganador) | Animación y ganador revelado, alta en historial | `screenshots/06-sorteo-ganador.png` | ✅ |
| Móvil — Captura | Diseño responsive a una columna | `screenshots/07-movil-captura.png` | ✅ |
| Móvil — Dashboard | KPIs y tabla adaptados a móvil | `screenshots/08-movil-dashboard.png` | ✅ |

## 4. Cobertura funcional

- **Autoregistro por QR (landing pública):** landing mobile-first y adaptativa,
  validación estricta de correo y celular (10 dígitos), aceptación obligatoria de
  términos y aviso de privacidad, disclaimer de contacto, protección anti-spam
  (honeypot + limitador de tasa por IP), manejo amistoso de duplicados, y páginas
  legales + QR imprimible. Fallback: registro por el personal.
- **Captura de leads:** alta, validación (nombre obligatorio, contacto mínimo,
  formato de correo), normalización de teléfono, detección de duplicados con
  opción de forzar, memoria del captador.
- **Captura por foto del gafete (OCR):** modo manual/gafete, cámara y subir
  imagen, OCR en el navegador (Tesseract.js offline), autocompletado de
  nombre/empresa/correo/teléfono con revisión manual, foto adjunta al lead y
  consultable desde el dashboard (📷). Probado de extremo a extremo con un
  gafete sintético (los 4 campos se extrajeron correctamente).
- **Sorteo:** conteo de elegibles, filtros (consentimiento, evitar repetidos),
  selección aleatoria, registro e historial de ganadores, anulación.
- **Dashboard:** KPIs (total, del día, consentimiento, tasa, ganadores),
  agregados por producto/fuente/hora/captador, tabla con búsqueda y filtro,
  exportación a CSV, eliminación de leads.
- **Seguridad/acceso:** captura pública; sorteo, dashboard y listado protegidos
  por `STAFF_PIN`; respuestas 401 verificadas.

## 5. Observaciones y recomendaciones

- El almacenamiento es un archivo JSON (`data/db.json`), adecuado para un evento
  con una sola instancia. Para uso concurrente en varios dispositivos con alta
  demanda, considerar migrar a una base de datos.
- Respaldar `data/db.json` (o exportar CSV) periódicamente durante el evento.
- Definir un `STAFF_PIN` en producción; sin él, sorteo y dashboard quedan
  abiertos (solo recomendable para pruebas).
- La **cámara** del navegador requiere contexto seguro (`localhost` o HTTPS). En
  una red por IP sin HTTPS, usar el botón «Subir imagen». El OCR es asistido:
  siempre revisar y corregir antes de guardar.
- **Producción:** publicar con **HTTPS** (necesario para cámara y QR). Antes del
  evento, completar los textos legales (`terminos.html`, `aviso-privacidad.html`)
  con la información de Mallatex. Guía en `DEPLOY.md`.
- El **límite anti-spam** del autoregistro es generoso (60/min por IP) para no
  bloquear el tráfico legítimo detrás del NAT del venue; ajustable por entorno.

_powered by Mallatex_
