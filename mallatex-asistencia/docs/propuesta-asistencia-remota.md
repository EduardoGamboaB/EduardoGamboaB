# Propuesta — Asistencia en modalidad remota (personal de campo)

Mallatex · Plataforma de Asistencia (NOI) — *powered by Evorgyn*

## 1. Contexto y objetivo

El checador facial fijo de planta cubre al personal en sitio, pero **no** al personal de
**campo** (reparto/conductores, cuadrillas, técnicos, supervisores de obra, ventas
foráneas). El objetivo es registrar su **entrada y salida de forma confiable**, con
**evidencia de identidad y ubicación**, e integrarla al **mismo flujo de nómina** (reglas →
periodos → exportación a Aspel NOI) sin procesos paralelos.

## 2. Retos del registro en campo

- No hay checador fijo: el registro se hace desde un **teléfono**.
- **Riesgo de fraude**: checar por otro compañero o desde un lugar distinto.
- **Conectividad intermitente**: puede no haber señal en el sitio.
- **Múltiples sitios/obras/clientes** con horarios distintos.
- Dispositivos variados (celular personal o de la empresa).

## 3. Solución propuesta

Una **aplicación web móvil (PWA)** —sin tienda de apps: se abre en el navegador del celular
y se puede "instalar" en la pantalla de inicio— para que el colaborador registre su
asistencia desde el campo. Reutiliza el **reconocimiento facial ya integrado** y suma
**geolocalización**:

1. **Selfie + reconocimiento facial** — verifica que es quien dice ser (mismo motor
   `face-api`, descriptor de 128 valores contra el rostro enrolado). Anti "checar por otro".
2. **Ubicación (GPS)** — captura latitud/longitud y la valida contra **geocercas** (un radio
   alrededor del sitio/obra autorizado). Guarda la **distancia** al sitio.
3. **Marca de tiempo del servidor** (no la del teléfono, para evitar manipulación).
4. **Selección de sitio/proyecto** cuando aplica.
5. **Evidencia**: foto + coordenadas quedan asociadas al registro.
6. **Modo sin conexión**: si no hay señal, el registro se guarda en el teléfono y se
   **sincroniza automáticamente** al recuperar internet.

Se apoya en **HTTPS** (ya requerido por la plataforma) para acceder a cámara y GPS.

## 4. Verificación anti-fraude (por capas)

| Capa | Qué valida |
|------|------------|
| **Rostro** | Coincidencia facial contra el enrolado (umbral configurable). |
| **Geocerca** | Que el registro ocurra **dentro del radio** del sitio autorizado; guarda la distancia. |
| **Ubicación simulada** | Detecta *mock location* / GPS falso y lo marca como sospechoso. |
| **Hora del servidor** | El sello de tiempo lo pone el servidor, no el dispositivo. |
| **Evidencia** | Foto + coordenadas + dispositivo, todo en **bitácora**. |
| *(Fase 2)* **Liveness** | Gesto/parpadeo para confirmar que es una persona en vivo, no una foto. |

## 5. Modalidades (según la operación)

- **A. Autoservicio** — cada colaborador checa desde su propio celular. *(Recomendado si
  tienen smartphone.)*
- **B. Por cuadrilla / supervisor** — el supervisor "pasa lista" de su equipo en el sitio
  con un solo dispositivo (reconoce cada rostro + una geocerca). Útil cuando no todos tienen
  teléfono.
- **C. Híbrido** — autoservicio donde se puede, cuadrilla donde no.

## 6. Integración con la plataforma actual (reutiliza ~70 %)

El registro de campo genera una **checada** igual que el checador fijo, con datos extra, y
pasa por **todo el flujo existente**:

```
Check-in en campo → checada (method: 'campo', GPS, sitio, foto) → motor de reglas
→ revisión/corrección → autorización → cierre de periodo → exportación NOI
```

- **Mismo motor de reglas** (entrada/salida, retardos, faltas, tiempo extra) y **misma
  exportación NOI**: sin proceso paralelo.
- **Nuevo catálogo de Sitios/Geocercas** y un indicador de **modalidad** por empleado
  (planta / campo / híbrido).
- **Nuevo reporte**: checadas en mapa, cumplimiento de geocerca y horas por sitio.
- **Nuevo rol acotado**: *Supervisor de campo* (para la modalidad por cuadrilla).
- Se enlaza de forma natural con **kilometraje (G3)** de conductores ya contemplado.

## 7. Modelo de datos (adiciones)

```jsonc
// sites  (catálogo de sitios / obras / clientes con geocerca)
{ "id", "name", "client", "lat", "lng", "radiusMeters", "active" }

// employees  (+campos)
{ "workMode": "planta | campo | hibrido", "allowedSiteIds": [ ... ] }

// checadas  (+campos cuando method = 'campo')
{ "method": "campo", "lat", "lng", "accuracy", "siteId",
  "distanceMeters", "withinGeofence", "facePhoto",
  "faceMatchDistance", "mocked", "deviceInfo" }
```

Endpoint nuevo (autenticado con la sesión del empleado):
`POST /api/field/checkin` — recibe tipo (entrada/salida), descriptor facial, GPS y sitio;
valida rostro + geocerca y crea la checada.

## 8. Seguridad y privacidad (LFPDPPP)

- **Consentimiento** explícito para uso de **ubicación** y **datos biométricos**, con aviso
  de privacidad (finalidad: control de asistencia) y política de **retención**.
- **GPS sólo al momento de checar** — no hay rastreo continuo del colaborador.
- Datos en tránsito por **HTTPS**; el rostro se guarda como **descriptor** (no como imagen
  reconstruible) salvo la foto-evidencia, cuya retención se define con el cliente.

## 9. Experiencia del colaborador (flujo)

1. Abre la app en su celular → **"Registrar asistencia"**.
2. Elige **Entrada/Salida** (y el **sitio**, si aplica).
3. La app pide **cámara** y **ubicación** → toma la selfie.
4. Valida rostro + geocerca → **"Entrada registrada · 08:02 · Obra Norte"**.
5. Sin señal → **"Guardado, se enviará al reconectar"**.

## 10. Hoja de ruta por fases

| Fase | Alcance |
|------|---------|
| **1 · MVP** | PWA de autoservicio: selfie + GPS + geocerca + modo offline; catálogo de sitios; checadas `campo` integradas al flujo y a NOI; reporte básico y bitácora con evidencia. |
| **2** | Modo cuadrilla/supervisor; *liveness*; mapa/heatmap de checadas; alertas fuera de geocerca; enlace con kilometraje (G3). |
| **3** | App nativa opcional; verificación reforzada; fichaje por **QR/NFC** en el sitio; tableros de cumplimiento por obra. |

## 11. Viabilidad (qué ya está resuelto)

- **Reconocimiento facial** (`face-api`) ya integrado y probado (kiosco).
- **Checadas + motor de reglas + exportación NOI** ya existen: el registro de campo entra
  por el mismo camino.
- **Autenticación de empleado + portal** ya construidos.
- **HTTPS / contexto seguro** ya resuelto para cámara (y ahora también GPS).

El desarrollo se concentra en lo **nuevo**: catálogo de **sitios/geocercas**, captura de
**GPS**, **cola offline** de sincronización y la **vista móvil** de check-in.

## 12. Decisiones a confirmar (para afinar el MVP)

- ¿El personal de campo tiene **smartphone** propio/empresa? → define A (autoservicio) vs B
  (cuadrilla).
- ¿La **geocerca es obligatoria** (rechaza fuera del radio) o sólo se **registra la
  distancia** para revisión?
- ¿Los **sitios son fijos** (obras/clientes) o el colaborador puede checar desde
  **cualquier lugar** dejando constancia de ubicación?
- ¿Se requiere **foto-evidencia** guardada, o basta el descriptor facial + coordenadas?

---

### Siguiente paso sugerido

Construir la **Fase 1 (MVP)** sobre la plataforma actual: catálogo de sitios con geocerca,
`POST /api/field/checkin` (rostro + GPS), vista móvil de check-in con modo offline, y el
reporte de checadas de campo — todo integrado al flujo de nómina y NOI existentes.
