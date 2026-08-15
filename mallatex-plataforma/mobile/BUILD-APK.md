# Generar el APK — Mallatex Campo

App Expo (SDK 51 / React Native 0.74). El proyecto nativo `android/` ya está
generado (`npx expo prebuild -p android`), con `applicationId = mx.mallatex.campo`.

Este entorno de nube **no puede compilar** el APK (la política de red bloquea los
servidores de Google/Expo y no hay Android SDK instalado). Compílalo en una PC con
Android Studio, o con EAS Build. Abajo están las dos rutas.

---

## Ruta A — Build local con Gradle (recomendada, produce el APK que instalas)

### 1. Requisitos (una sola vez)
- **JDK 17** (el AGP de RN 0.74 lo espera; con JDK 21 pueden aparecer avisos).
- **Android Studio** → instala **Android SDK Platform 34** y **Build-Tools 34**.
- Variables de entorno:
  ```bash
  export ANDROID_HOME="$HOME/Android/Sdk"      # ruta del SDK
  export PATH="$ANDROID_HOME/platform-tools:$PATH"
  ```
- Acepta las licencias: `yes | sdkmanager --licenses`

### 2. Instala dependencias JS
```bash
cd mallatex-plataforma/mobile
npm install
```

### 3. Apunta la app al backend
La app trae una pantalla **«Configurar servidor»** en el login, así que puedes
dejar la URL por defecto y cambiarla en el dispositivo. Si prefieres fijarla en el
binario, edita antes de compilar:
```
src/config.js →  export const DEFAULT_SERVER_URL = 'https://TU-GATEWAY';
```
(Producción actual: `https://mallatex.up.railway.app`.)

### 4a. APK de RELEASE (autónomo — el que se instala en la tablet)
Un APK de release **empaqueta el JS adentro**, así que funciona sin servidor Metro.
Necesita una firma. Genera un keystore una sola vez:
```bash
cd mallatex-plataforma/mobile/android/app
keytool -genkeypair -v -keystore mallatex.keystore \
  -alias mallatex -keyalg RSA -keysize 2048 -validity 10000
```
Agrega las credenciales en `android/gradle.properties`:
```
MALLATEX_UPLOAD_STORE_FILE=mallatex.keystore
MALLATEX_UPLOAD_KEY_ALIAS=mallatex
MALLATEX_UPLOAD_STORE_PASSWORD=****
MALLATEX_UPLOAD_KEY_PASSWORD=****
```
En `android/app/build.gradle`, dentro de `android { }`, añade el signingConfig y
úsalo en `buildTypes.release`:
```gradle
signingConfigs {
    release {
        storeFile file(MALLATEX_UPLOAD_STORE_FILE)
        storePassword MALLATEX_UPLOAD_STORE_PASSWORD
        keyAlias MALLATEX_UPLOAD_KEY_ALIAS
        keyPassword MALLATEX_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release   // (por defecto usa el debug)
        // ...resto igual
    }
}
```
Compila:
```bash
cd mallatex-plataforma/mobile/android
./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

### 4b. APK de DEBUG (rápido, para probar)
Sale firmado con la llave debug, listo para instalar, **pero requiere el servidor
Metro corriendo** en la misma red (`npx expo start`). Útil para pruebas, no para
entregar la tablet a un vendedor.
```bash
cd mallatex-plataforma/mobile/android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

### 5. Instalar en la tablet
- **Por cable:** `adb install -r app/build/outputs/apk/release/app-release.apk`
- **Manual:** copia el `.apk` a la tablet, ábrelo y activa
  *Ajustes → Seguridad → Instalar apps de origen desconocido* para el explorador de
  archivos.

---

## Ruta B — EAS Build (en la nube, sin Android Studio)

`eas.json` ya tiene el perfil `preview` configurado para **APK**.
```bash
cd mallatex-plataforma/mobile
npm i -g eas-cli
eas login                                  # cuenta Expo (gratuita)
eas build -p android --profile preview     # genera el APK en la nube
```
Al terminar te da un enlace de descarga del `.apk`. Instálalo como en el paso 5.

> Nota: la primera corrida te pedirá crear/enlazar un `projectId` de EAS y generar
> un keystore administrado (Expo lo guarda por ti).

---

## Referencia rápida
| Objetivo | Comando | Salida |
|---|---|---|
| APK autónomo | `./gradlew assembleRelease` | `app/build/outputs/apk/release/app-release.apk` |
| APK de prueba | `./gradlew assembleDebug` | `app/build/outputs/apk/debug/app-debug.apk` |
| APK en la nube | `eas build -p android --profile preview` | enlace de descarga |
