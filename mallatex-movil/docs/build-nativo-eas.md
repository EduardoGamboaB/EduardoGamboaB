# Build nativo con EAS — Mallatex Campo

Guía para compilar la app móvil como **binario nativo** (APK/AAB para Android, IPA para iOS)
usando **EAS Build** (Expo Application Services). El build nativo habilita en dispositivo real
lo que **Expo Go no permite**:

- **GPS continuo en segundo plano** (foreground service, seguimiento de ruta con la app cerrada).
- **Biometría** (huella / Face ID) para el candado de sesión.
- **Cámara** para selfie de asistencia y evidencia de visitas/gastos.

> El código ya está listo (`src/tracking.js`, `src/biometrics.js`, permisos en `app.json`).
> Solo falta compilar el binario, cosa que ocurre en los servidores de Expo con **tu** cuenta.

---

## 0. Requisitos (una sola vez)

1. **Cuenta Expo** (gratis): https://expo.dev/signup
2. **Node 18+** y la CLI de EAS:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. Para **iOS**: cuenta de **Apple Developer** ($99/año). EAS gestiona certificados y perfiles.
   Para **Android**: nada extra; EAS genera el keystore (o subes el tuyo).

---

## 1. Vincular el proyecto a tu cuenta

Desde `mallatex-movil/`:

```bash
eas init
```

Esto crea el proyecto en tu cuenta Expo y escribe `extra.eas.projectId` y `owner` en `app.json`.
No lo hicimos por ti porque queda ligado a **tu** organización; es el único paso que requiere
tus credenciales.

---

## 2. Compilar

Ya dejamos los perfiles en `eas.json` y atajos en `package.json`:

| Perfil | Para qué | Comando |
|--------|----------|---------|
| `development` | Dev client con menú de depuración (recarga en vivo, GPS/biometría reales). | `npm run build:dev` |
| `preview` | APK interno para QA en dispositivos del equipo (sin tiendas). | `npm run build:preview` |
| `production` | AAB (Play Store) / IPA (App Store). Autoincrementa versión. | `npm run build:android` · `npm run build:ios` |

Ejemplos:

```bash
# APK de prueba para instalar directo en un Android del equipo
npm run build:preview

# Producción para ambas plataformas
npm run build:all
```

Al terminar, EAS entrega una **URL de descarga** del binario (o lo instala vía QR con
`--profile development`). El APK de `preview` se instala arrastrándolo al emulador o con
`adb install <archivo>.apk`.

---

## 3. Correr el dev build en el emulador/dispositivo

Con un build `development` instalado:

```bash
npx expo start --dev-client
```

Abre la app instalada (no Expo Go) y escanea el QR / conéctate por LAN. Aquí **sí** corren
GPS en segundo plano, biometría y cámara con permisos nativos.

---

## 4. Configurar el servidor (importante)

La app apunta por defecto a `http://10.0.2.2:3000` (emulador Android → tu PC). En dispositivo
físico o producción, cámbialo:

- En caliente: pantalla de **Acceso → URL del servidor** (se guarda en el dispositivo).
- Por defecto: edita `DEFAULT_SERVER_URL` en `src/config.js`
  (p. ej. `https://mallatex.onrender.com`).

En el **backend**, agrega el origen de la app a `CORS_ORIGINS` si aplica, y sirve por **HTTPS**
(la cámara y la ubicación exigen contexto seguro).

---

## 5. Publicar en tiendas (opcional)

```bash
npm run submit:android   # sube el AAB a Google Play (track interno)
npm run submit:ios       # sube el IPA a App Store Connect (TestFlight)
```

Requiere: ficha creada en **Play Console** / **App Store Connect**, credenciales de servicio
(Google) o sesión de App Store (`eas submit` guía el proceso).

---

## Versionado

- `app.json` → `version` (visible al usuario), `android.versionCode`, `ios.buildNumber`.
- `eas.json` usa `appVersionSource: "remote"` y `autoIncrement` en producción: EAS lleva el
  contador de builds por ti; solo subes `version` cuando cambia la versión pública.
- `runtimeVersion.policy = "appVersion"`: fija la compatibilidad de OTA a la versión pública.

## OTA updates (opcional, fase posterior)

Para enviar cambios de JS sin recompilar (EAS Update), agrega `expo-updates`:

```bash
npx expo install expo-updates
eas update --branch production
```

Los `channel` de `eas.json` (`preview`/`production`) ya quedan listos para enlazarse con las
ramas de EAS Update cuando se habilite.

---

## Solución de problemas

| Síntoma | Causa / arreglo |
|---------|-----------------|
| `Cannot read properties of undefined (reading 'transformFile')` | Versión de Metro incompatible. Ya se fija Metro **0.80.12** en `package.json` (`overrides`) + `package-lock.json`. Corre `npm ci`. |
| El build no toma GPS en segundo plano | Debe ser build **nativo** (dev/preview/production), no Expo Go. Verifica permisos `ACCESS_BACKGROUND_LOCATION`/`UIBackgroundModes` en `app.json`. |
| iOS pide Face ID pero falla | Falta `NSFaceIDUsageDescription` (ya incluido) y probar en dispositivo físico (el simulador no tiene biometría real salvo *Features → Face ID*). |
| La app no conecta al backend | URL del servidor incorrecta o sin HTTPS/CORS. Ver sección 4. |
