# Mallatex — App móvil unificada (Campo + Ventas + MES)

App **nativa** (iOS/Android) construida con **React Native + Expo**. Es la **app única** de la
plataforma Mallatex: unifica en un mismo binario y **un solo backend** (`https://mallatex.up.railway.app`)
tres familias de módulos, cada una habilitada por el **perfil del colaborador** (`profile.modules`):

- **Campo** — asistencia remota con selfie + geocerca GPS (`/api/auth`, `/api/field/*`); las
  checadas entran al mismo motor de reglas y a la exportación a **Aspel NOI**.
- **Ventas (CRM móvil)** — cartera de clientes, ruta de visitas, cotizador, pedidos, viáticos,
  gastos y facturas (`/api/sales/*`).
- **MES (líneas de producción)** — **Tablet de línea** (alta de operadores + escaneo de QR de
  rollo + alertas a supervisión), **Producción** (tablero de líneas y avance de órdenes) y
  **Reporte de merma** por categoría (`/api/mes/*`). Solo visibles para el perfil `línea`.

> El **menú lo dicta el backend**: `allowedMenu(profile.modules)` filtra los módulos, por lo que
> cada colaborador ve únicamente lo que su perfil habilita (un vendedor no ve MES; un operador
> de línea no ve el CRM).

> React Native compila a una app **nativa real** (no es un WebView ni una PWA): un solo
> código para iOS y Android.

## Capturas

| Acceso | Registro | Selfie |
|---|---|---|
| ![Acceso](docs/screenshots/01-acceso.png) | ![Registro](docs/screenshots/02-registro.png) | ![Selfie](docs/screenshots/03-selfie.png) |

| Confirmación (geocerca validada) | Historial |
|---|---|
| ![Confirmación](docs/screenshots/04-confirmacion.png) | ![Historial](docs/screenshots/05-historial.png) |

| Menú (escalable) | Mi perfil (con biometría) |
|---|---|
| ![Menú](docs/screenshots/06-menu.png) | ![Perfil](docs/screenshots/07-perfil.png) |

> Capturas del flujo real (acceso → registro con selfie + GPS → validación de geocerca →
> historial), tomadas contra el backend con datos demo.

> **En evolución a CRM móvil de ventas.** Ver la arquitectura y hoja de ruta completa en
> [`docs/crm-movil-roadmap.md`](docs/crm-movil-roadmap.md).

## CRM de ventas (Fase 1)

| Menú (Ventas / Herramientas) | Mis clientes (cartera) | Mi desempeño |
|---|---|---|
| ![Menú](docs/screenshots/11-crm-menu.png) | ![Clientes](docs/screenshots/12-crm-clientes.png) | ![Desempeño](docs/screenshots/13-crm-desempeno.png) |

- **Cartera de clientes/prospectos** asignada desde central (app web del gerente comercial);
  el vendedor la consulta y da de alta prospectos en campo.
- **Ruta de visitas**: inicia la ruta (registro de recorrido por **GPS**), la actualiza y la
  finaliza.
- **Registrar visita** con **evidencia (foto)**, **estatus** (realizada / no localizado /
  reagendada), **tipo** (prospección, seguimiento, cierre, cobranza, entrega, postventa),
  si se **encontró** al cliente, notas y ubicación. **Funciona offline**.
- **Mi desempeño**: objetivo de venta del trimestre, avance y KPIs (cartera, prospectos,
  visitas).
- **Próximos módulos** (en el menú, *pronto*): Inventario, Cotizador, Pedidos, Asistente
  técnico (bot), Viáticos, Gastos, Facturas.

## Funcionalidades base

- **Identidad Mallatex**: logotipo oficial en acceso, encabezado y menú; icono de app,
  splash y adaptive icon con la marca.
- **Acceso biométrico** (Face ID / huella, `expo-local-authentication`): tras el primer
  acceso con código + PIN, la app ofrece activar biometría; al reabrir, la sesión se
  desbloquea con el sensor del dispositivo. Se administra desde *Mi perfil*.
- **Menú lateral escalable**: navegación por secciones (Asistencia · Cuenta) con espacio
  para futuros módulos (Recibos, Vacaciones, Tickets — marcados *pronto*).
- **Acceso del colaborador** con código + PIN (misma cuenta del portal).
- **Registro de entrada/salida** desde el campo con:
  - **Selfie** (cámara frontal) como evidencia de identidad.
  - **Ubicación GPS** validada contra la **geocerca** del sitio (dentro/fuera + distancia).
  - **Hora del servidor** (no la del teléfono).
  - Detección de **ubicación simulada** (mock).
- **Modo sin conexión**: si no hay señal, el registro se **guarda y se sincroniza** al
  reconectar (cola local + botón de sincronizar).
- **Historial** de tus registros con estado de geocerca.

## Requisitos

- **Node.js ≥ 18** y la CLI de Expo (`npx expo`).
- La app de **Expo Go** en tu teléfono (para probar), o **EAS Build** (para generar el
  instalable nativo `.apk`/`.ipa`).
- El **backend** (`mallatex-asistencia`) corriendo y accesible desde el teléfono.

## Puesta en marcha (pruebas con Expo Go)

```bash
cd mallatex-movil
npm install
# alinea las versiones de los módulos nativos con el SDK de Expo:
npx expo install expo-camera expo-location expo-secure-store @react-native-async-storage/async-storage expo-status-bar
npx expo start
```

Escanea el QR con **Expo Go**. En la pantalla de acceso, toca **“Configurar servidor”** y
pon la URL del backend:

- **Emulador Android:** `http://10.0.2.2:3000`
- **Teléfono físico (misma red Wi‑Fi):** `http://IP-DE-TU-PC:3000`
- **Producción:** `https://tu-dominio` (o `https://tu-app.onrender.com`)

Entra con una cuenta de campo de la demo: código **`MTX013`**, PIN **`1234`**.

> La cámara y el GPS requieren **permisos** (se piden en la app) y, para el GPS de alta
> precisión, tener la ubicación activada. Sobre datos móviles/producción usa **HTTPS**.

## Generar el instalable nativo (producción)

Con **EAS Build** (requiere una cuenta gratuita de Expo):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview   # genera un .apk instalable
eas build -p ios --profile preview       # requiere cuenta de Apple Developer
```

Publica el `.apk` internamente o súbelo a Play Store / App Store.

## Estructura

```
mallatex-movil/
├── App.js                      # Navegación, sesión y sincronización offline
├── app.json                    # Config Expo, permisos (cámara/ubicación), identidad
├── src/
│   ├── api.js                  # Cliente REST (/api/auth, /api/field/*)
│   ├── config.js               # URL del servidor por defecto
│   ├── storage.js              # Token (SecureStore) + cola offline (AsyncStorage)
│   ├── theme.js                # Colores corporativos Mallatex
│   └── screens/
│       ├── LoginScreen.js
│       ├── CheckinScreen.js    # Cámara + GPS + geocerca + envío/cola
│       └── HistoryScreen.js
```

## Backend que consume (ya implementado)

- `POST /api/auth/login` — acceso del empleado (código + PIN).
- `GET  /api/field/me` — perfil de campo + sitios permitidos + últimos registros.
- `GET  /api/field/sites` — sitios (geocercas) del colaborador.
- `POST /api/field/checkin` — registra entrada/salida con GPS/geocerca y evidencia.
- `GET  /api/field/checkins` — historial de registros de campo.

Los sitios/geocercas se administran en el backend (colección `sites`, API `/api/sites`).

## Verificación facial (fase 2)

Esta versión captura la **selfie como evidencia** y confía la identidad al acceso con
código + PIN, más la geocerca. La **coincidencia facial en el dispositivo** (comparar el
rostro contra el enrolado) es la **fase 2**: se integra con un módulo nativo de visión
(`react-native-vision-camera` + MLKit / un modelo on-device) que calcula el descriptor y lo
envía a `/api/field/checkin` (el backend ya acepta el campo `descriptor` y lo compara contra
el rostro enrolado del empleado). Requiere un *build* nativo (no Expo Go).

---

**Mallatex** — Asistencia de campo · *powered by Evorgyn*
