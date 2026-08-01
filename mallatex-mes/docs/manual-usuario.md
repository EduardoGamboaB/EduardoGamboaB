# Manual de usuario — Mallatex MES v0.6

> Sistema de Gestión de Manufactura para **Tejidos Técnicos Mallatex S.A.
> de C.V.** — planta Zapopan, Jal. y sucursal Ensenada, B.C.
> Última revisión: v0.6 · 2026

---

## Índice

1. [Introducción](#1-introducción)
2. [Glosario y convenciones](#2-glosario-y-convenciones)
3. [Acceso y navegación](#3-acceso-y-navegación)
4. [Manual por perfil](#4-manual-por-perfil)
   - 4.1 [Tablet de Línea (operadores)](#41-tablet-de-línea--operadores)
   - 4.2 [Producción · Carlos A.](#42-producción--carlos-a)
   - 4.3 [Almacén · Alberto O.](#43-almacén--alberto-o)
   - 4.4 [Operaciones · Víctor G.](#44-operaciones--víctor-g)
   - 4.5 [Cobranza · María L.](#45-cobranza--maría-l)
   - 4.6 [Dirección · Víctor F. G.](#46-dirección--víctor-f-g)
5. [Módulo IA Pro (Fase 4 · demo)](#5-módulo-ia-pro--fase-4--demo)
6. [Flujos end-to-end](#6-flujos-end-to-end)
7. [Troubleshooting](#7-troubleshooting)
8. [Matriz de roles y responsabilidades](#8-matriz-de-roles-y-responsabilidades)
9. [Anexo — página web pública](#9-anexo--página-web-pública-mallatexcommx)
10. [Soporte](#10-soporte)

---

## 1. Introducción

### ¿Qué es Mallatex MES?

Un sistema web que digitaliza el piso de producción y centraliza la
información operativa que hoy vive dispersa entre archivos Excel, WhatsApp
y memoria de los operadores. Reemplaza las hojas de cálculo de
`PLANEACION_DE_PEDIDOS.xlsx` y `Sistema_de_productividad.xlsx` sin
sacrificar la información que ya se recoge.

### ¿A quién sirve?

Al equipo operativo completo (6 perfiles):

| Perfil | Persona | Responsabilidad principal |
|---|---|---|
| **Tablet de Línea** | Operadores del piso | Fichar turno, tocar piezas, reportar |
| **Producción** | Carlos A. | Planeación, asignaciones, verificación |
| **Almacén** | Alberto O. | Recepción, egreso, inventario |
| **Operaciones** | Víctor G. | Coordinación SAE, auditoría |
| **Cobranza** | María L. | Liberación de pedidos con pago confirmado |
| **Dirección** | Víctor F. Gamboa Castro | KPIs ejecutivos, OEE |

### Alcance actual (v0.6)

- ✅ **Fase 1** — Prototipo navegable con datos reales del cliente
- ✅ **Fase 2** — Persistencia local (localStorage), demo presentable
- 🔜 **Fase 3** — MVP funcional con Excel export/import, PDF, notificaciones
- 🔜 **Fase 4** — Módulo IA Consultiva Pro (spec listo, mockup incluido)

### Lo que **NO** hace todavía

- No se conecta al SAE de Aspel (planeado para Fase 3+)
- No tiene autenticación real (hoy es selector de perfil libre)
- No genera PDFs (Fase 3.5)
- Los datos viven en el navegador (localStorage) — cerrar sesión de
  incógnito borra todo

---

## 2. Glosario y convenciones

### 2.1 Procesos formales

Cada vista lleva una etiqueta roja `MT-PC-XXX` que ancla esa pantalla al
proceso documentado del cliente:

| Código | Proceso | Actividades |
|---|---|---|
| **MT-PC-001-2026** | Ingreso de material | 29 actividades |
| **MT-PC-002-2026** | Egreso de material | 17 actividades |
| **MT-PC-003-2026** | Producción | 53 actividades |
| **MT-MA-001-Admon** | Manual de Organización | Estructura y perfiles |

### 2.2 Documentos que digitaliza

| Código | Documento | Reemplaza en el MES |
|---|---|---|
| **MT-DT-001** | Recepción de material | Almacén → Recepción |
| **MT-DT-002** | Egreso a producción | Almacén → Egreso |
| **MT-DT-003** | Control de material en producción | Producción → Mermas |
| **MT-DT-004** | Conteo de rollos | Almacén → Rollos |
| **MT-DT-005** | Retorno a almacén | Almacén → Retorno |
| **MT-DT-006** | Check list de PT (pesaje) | Producción → Pesaje |

### 2.3 Tipos de operador (MT-PC-003 política 2)

| Tipo | Competencia | Ejemplos |
|---|---|---|
| **A** | 1 máquina (una operación) | Karen, Lorena, Carmen, Sarai, Fátima |
| **B** | 2 máquinas | Jesús, Nayeli, Juan |
| **C** | 3 máquinas | Eva |
| **D** | Polivalente (todas) | Erik |

### 2.4 Líneas reales

| ID | Nombre | Proceso | Emoji |
|---|---|---|---|
| **LC1** | Costura 1 | costura | 🧵 |
| **LC2** | Costura 2 | costura | 🧵 |
| **LC3** | Costura 3 | costura | 🧵 |
| **LC4** | Costura 4 | costura | 🧵 |
| **LK** | Corte | corte | ✂️ |
| **LP** | Perforadora | perforación | 🔨 |
| **LE** | Embobinado | embobinado | 📦 |

### 2.5 Estados de pedido

Los pedidos avanzan por estos estados y cada uno tiene su color:

`pendiente cobranza` → `liberado` → `stock faltante` / `en compra` →
`material egresado` → `en producción` → `terminado` → `entregado`.
El estado `detenido` puede aparecer en cualquier momento.

### 2.6 Categorías de material (MT-PC-003 política 8)

| Categoría | Color | Uso |
|---|---|---|
| **Materia prima** | negro | Material nuevo egresado de almacén |
| **Sobrante** | verde | Regresa a almacén (reciclable) |
| **Defecto** | ámbar | Defecto proveedor, se reclama |
| **Desperdicio** | rojo | Merma final, no se recupera |

---

## 3. Acceso y navegación

### 3.1 Cómo entrar

Abre el navegador en la URL del sistema (localhost:3000 en demo).
Verás el **Selector de Perfil** con 6 tarjetas: elige el tuyo.

Si es la primera vez, verás una página blanca con el logo Mallatex y las
6 tarjetas. Si ya has entrado antes en este navegador, aparece un
**banner rosa** arriba diciendo *"Datos del demo guardados localmente ·
Última sesión: hace X"* — significa que tus cambios se recuperaron.

### 3.2 Navegación dentro de cada perfil

Todos los perfiles (excepto la Tablet) comparten esta estructura:

```
┌─────────────────────────────────────────────────────────┐
│ ▍ ROJO SUPERIOR                                          │
├───────────────┬─────────────────────────────────────────┤
│ MALLATEX MES  │  Ruta / vista actual · MT-PC-XXX        │
│ ────────────  │  ─────────────────────────────────────── │
│ 👤 Nombre     │                                          │
│    Perfil MES │  Contenido principal (tablero, tablas,   │
│ ────────────  │  formularios, mapas)                     │
│ 📊 Vista 1    │                                          │
│ 📋 Vista 2    │                                          │
│ 🔔 Vista 3 (3)│                                          │
│ ────────────  │                                          │
│ Sección…      │                                          │
│ ↩ Cambiar     │                                          │
│   perfil      │                                          │
└───────────────┴─────────────────────────────────────────┘
                                          [ ✨ IA Pro ○ ]
```

- **Sidebar izquierdo** (menú Bento): tarjetas emoji + label con la vista
- **Contenido principal**: tablas, formularios, indicadores
- **Botón "Cambiar perfil"** al final del sidebar: te regresa al selector
- **Burbuja roja PRO** flotante en esquina inferior derecha: asistente IA

### 3.3 Persistencia y reset

- Todos tus cambios se guardan automáticamente en `localStorage` (300 ms
  después de cada cambio)
- Cerrar y reabrir el navegador **conserva** tus datos
- Para volver al estado inicial: botón **"Reset demo"** en el footer del
  selector de perfil, o en el banner rosa de la portada
- Ambos piden confirmación antes de limpiar

### 3.4 Cambiar de perfil

En cualquier momento haz clic en **"↩ Cambiar perfil"** del sidebar
para volver al selector.

---

## 4. Manual por perfil

### 4.1 Tablet de Línea · Operadores

**Quién lo usa:** los operadores del piso de producción.
**Dispositivo:** una tablet fija por línea (LC1-LC4, LK, LP, LE).
**Proceso:** MT-PC-003 actividades 7-23.

#### Instalación inicial (solo una vez)

1. Abre `/tablet` en la tablet.
2. En "¿Qué línea es esta tablet?" toca la línea correspondiente (LC1,
   LK, etc.).
3. Ya quedó configurada. No la cambies a menos que se mueva físicamente
   a otra línea.

#### Uso diario · secuencia recomendada

**Al iniciar turno:**

1. Toca **"👋 Empezar — ficha tu turno"** (rojo pulsante).
2. Selecciona tu foto/nombre en la lista de operadores autorizados para
   esta línea.
3. Aparece tu avatar coloreado arriba a la derecha en un chip.
4. Si otro compañero se suma, toca el botón **`+`** y él ficha también.
5. El operador que está *tocando piezas ahora mismo* se resalta en rojo.

**Durante el turno:**

- **➕ +1 pieza** — cada vez que completes una pieza, tócala. Suma al
  contador del pedido activo.
- **📷 Escanear rollo** — para asignar un rollo específico al pedido.
  Apunta la cámara al QR de la etiqueta o toca el simulado.
- **⏸️ Pausar / Reportar** — cuando hay un problema (sin material, falla,
  sin luz, etc.). Selecciona el tipo con los iconos grandes y envía.
- **⚠️ Reportar merma** — cuando hay material perdido. Selecciona
  categoría (sobrante/defecto/desperdicio), pon los metros, opcional
  foto. Guardar.
- **✅ Terminar orden** — cuando la producción del pedido está lista.
  Producción verificará el pesaje después.

**Multi-operador simultáneo:**

- Varios operadores pueden estar fichados en la misma línea al mismo
  tiempo (arreglando algo, o turnándose piezas).
- El sistema registra quién tocó cada pieza según el operador activo
  (el que está en rojo).

#### Reglas de oro para operadores

- **No dejes la tablet sin desfichar** al final del turno.
- **No inventes rollos** — siempre escanea el QR real.
- **Todo problema se reporta**, aunque sea pequeño (comida, baño).
- **Si el sistema no te deja hacer algo**, revisa que estés fichado y
  hayas seleccionado tu chip (rojo).

---

### 4.2 Producción · Carlos A.

**Rol formal:** Jefe de Producción.
**Ruta:** `/produccion`.
**Proceso:** MT-PC-003 (53 actividades).

#### Vistas del menú (9)

| Vista | Emoji | Qué haces aquí |
|---|---|---|
| **Tablero** | 📊 | Panorama general: cuántas líneas activas, avisos urgentes, defectos hoy |
| **Bitácora pedidos** | 📋 | Reemplaza `PLANEACION_DE_PEDIDOS.xlsx`. Todos los pedidos con status |
| **Productividad** | ⏱️ | Reemplaza `Sistema_de_productividad.xlsx`. mL/hr por operador |
| **Planificación** | 📅 | Calendario de producción de la semana |
| **Líneas** | 🏭 | Estado detallado de cada línea (LC1-LE) |
| **Asignar operadores** | 👷 | Ver competencias tipo A/B/C/D y asignar a órdenes |
| **Avisos** | 🔔 | Avisos del piso (llegan de las tablets). Badge con # urgentes |
| **Pesaje final** | ⚖️ | MT-DT-006 · verificar peso teórico vs real de PT |
| **Mermas y defectos** | ⚠️ | MT-DT-003 · registros del piso agrupados por categoría |
| **Documentos** | 📄 | MT-DT-003/004/006 · formatos |

#### Tareas frecuentes

**Programar un pedido nuevo:**

1. Ve a **Tablero** → sección "Pedidos liberados pendientes de programar".
2. Los que ya tienen material egresado (badge verde) están listos.
3. Haz clic en **"Iniciar"** — asigna la primera línea y estado
   `en producción`.

**Revisar la productividad del turno anterior:**

1. Ve a **Productividad** → filtra por fecha "Hoy" o "Esta semana".
2. Cada renglón muestra `hora inicio · hora final · imprevistos ·
   tiempo efectivo · mL turno · piezas · mL/hr calculado`.
3. Compara con el promedio histórico del operador (columna mL/hr) —
   está en verde/rojo si está sobre/bajo el promedio.

**Atender un aviso urgente:**

1. Ve a **Avisos** (o badge del sidebar).
2. Los urgentes están en rojo con `🔴`.
3. Haz clic en **"Atender"** → el aviso se marca como en proceso.

**Verificar el pesaje de un producto terminado:**

1. Ve a **Pesaje final**.
2. Confirma que peso real (columna `Real`) esté dentro de ±5% del peso
   teórico (`Teórico`).
3. Si `Δ` está en rojo (>5% diferencia), no verifiques — investiga
   con el operador.

---

### 4.3 Almacén · Alberto O.

**Rol formal:** Responsable de almacén.
**Ruta:** `/almacen`.
**Procesos:** MT-PC-001 (ingreso) + MT-PC-002 (egreso).

#### Vistas del menú (7)

| Vista | Emoji | Qué haces aquí |
|---|---|---|
| **Panel** | 📊 | KPIs almacén: rollos disponibles, empezados, recepciones/egresos hoy |
| **Recepción** | 📥 | MT-PC-001 · MT-DT-001 · recibir materia prima de proveedores |
| **Muestreo calidad** | 🔬 | Prueba visual/táctil/peso a 1 de cada 5 rollos |
| **Egreso a producción** | 📤 | MT-PC-002 · MT-DT-002 · surtir material a producción |
| **Retorno a almacén** | ↩️ | MT-DT-005 · devolver sobrantes que regresan de producción |
| **Rollos** | 📦 | Inventario completo con QR, lote, ubicación, estado |
| **Ubicaciones** | 📍 | Mapa de zonas A/B/C/D con conteo de rollos |

#### Reglas de oro (MT-PC-002 § 3)

1. **Ningún egreso sin liberación de Cobranza.** Si el pedido no está en
   estado `liberado`, no puedes surtirlo. Cobranza es quien libera.
2. **Prioriza rollos empezados sobre nuevos.** El indicador amarillo
   "Empezados" del panel te muestra cuáles hay que usar primero.
3. **Muestreo obligatorio.** 1 de cada 5 rollos recibidos.
   Diferencias → segunda muestra. Persiste → limitar acceso al
   proveedor.
4. **Registrar en SAE en máx. 1 día hábil** después de recibir.

#### Tareas frecuentes

**Recibir una nueva entrega:**

1. Ve a **Recepción** → **"+ Nueva recepción"**.
2. Llena Packing List, factura, proveedor, rollos, peso total.
3. Aplica muestreo → si pasa, marca "Muestreo OK".
4. Registra en SAE (columna "En SAE" → check verde).
5. Se genera MT-DT-001.

**Egresar material a producción:**

1. Ve a **Panel** → tabla "Pedidos pendientes de egreso".
2. Solo aparecen los pedidos con pago confirmado (badge verde).
3. Haz clic en **"Surtir material"**.
4. El sistema genera MT-DT-002 y marca el pedido como
   `material egresado`.
5. Producción puede iniciar.

**Buscar un rollo específico:**

1. Ve a **Rollos**.
2. Usa la columna `QR` (id del rollo) para localizar.
3. La columna `Ubicación` te dice zona-pasillo-nivel (ej. `A-3-12`).

---

### 4.4 Operaciones · Víctor G.

**Rol formal:** Coordinador de operaciones.
**Ruta:** `/operaciones`.
**Alcance:** transversal a los 3 procesos (MT-PC-001/002/003).

#### Vistas del menú (6)

| Vista | Emoji | Qué haces aquí |
|---|---|---|
| **Panel** | 📊 | Indicadores globales y material con defecto/sobrante para SAE |
| **Sistema SAE** | 🔄 | Traspasos de inventario (Materia prima → Producción → PT) |
| **Auditoría** | 🛡️ | Auditorías 2×/mes de cumplimiento de procesos |
| **Reclamos** | ⚠️ | Reclamos formales a proveedores |
| **Devoluciones** | ↩️ | Devoluciones autorizadas |
| **Documentos** | 📄 | Formatos MT-DT-001 a MT-DT-006 |

#### Tareas frecuentes

**Registrar traspasos en SAE (fin de día):**

1. Ve a **Sistema SAE** → **"Sincronizar"**.
2. Confirma cada movimiento (entrada, traspaso, salida).
3. Los renglones aparecen con `Fecha · Tipo · Origen · Destino · Cantidad`.

**Auditar cumplimiento (2×/mes):**

1. Ve a **Auditoría**.
2. Selecciona un caso aleatorio (recepción, egreso o pedido de
   producción).
3. Revisa que la documentación esté completa y firmada.
4. Registra hallazgos y % de cumplimiento.

**Escalar un reclamo a proveedor:**

1. En **Panel** → "Material con defecto para procesar en SAE".
2. Los defectos con `Btn Notificar proveedor` (rojo) los pasas a
   **Reclamos** para dar seguimiento formal.

---

### 4.5 Cobranza · María L.

**Rol formal:** Responsable de cobranza.
**Ruta:** `/cobranza`.
**Directiva:** MT-PC-003 § general — *"Ningún pedido pasa a producción
sin confirmar pago"*.

#### Vistas del menú (4)

| Vista | Emoji | Qué haces aquí |
|---|---|---|
| **Panel** | 📊 | KPIs cobranza + pedidos pendientes con botón "Liberar" |
| **Por liberar** | ⏰ | Lista completa de pedidos sin pago confirmado. Badge = # |
| **Liberados** | ✅ | Historial de pedidos ya liberados |
| **Historial** | 📋 | Liberaciones del mes con monto y tipo (liquidación/crédito) |

#### La única tarea crítica

**Liberar un pedido:**

1. Ve a **Panel** o **Por liberar**.
2. Cada pedido pendiente muestra `Pedido · Cliente · Producto · M² ·
   Compromiso`.
3. Haz clic en **"Liberar"** (verde).
4. El sistema pregunta *"¿Confirmar pago del pedido X y liberar a
   producción?"* → confirma.
5. El pedido pasa a estado `liberado`. Ahora Almacén puede egresar.

**Regla:** verifica en el ERP que el pago esté acreditado o que el
crédito esté autorizado. Si no, **no liberes**.

---

### 4.6 Dirección · Víctor F. G.

**Rol formal:** Director general.
**Ruta:** `/direccion`.
**Alcance:** vista ejecutiva, solo lectura.

#### Vistas del menú (7)

| Vista | Emoji | Qué haces aquí |
|---|---|---|
| **Ejecutivo** | 📊 | Tablero de la semana: m² producidos, OEE, entregas a tiempo, costo merma |
| **KPI Ingreso** | 📥 | Indicadores formales MT-PC-001 § 6 |
| **KPI Egreso** | 📤 | Indicadores formales MT-PC-002 § 6 |
| **KPI Producción** | 🏭 | Indicadores formales MT-PC-003 § 6 |
| **Productividad** | 📈 | Productividad por operador (datos reales del Excel) |
| **Costos** | 💰 | Costo por pedido: MP + mano obra + merma + margen |
| **Pedidos SAE** | 📋 | Todos los pedidos en flujo con status |

#### Interpretación rápida del tablero ejecutivo

- **OEE 76%** — Disponibilidad × Rendimiento × Calidad. Meta interna 80%.
- **Entregas a tiempo 94%** — 17 de 18 esta semana. Investigar el 1
  fallido en la vista "Pedidos SAE".
- **Costo merma $28,470** — 2.3% del total. Está bajo control (<3%).
- **Filtro superior** (hoy/semana/mes/año) cambia el período.

---

## 5. Módulo IA Pro · Fase 4 · demo

> **Estado actual: mockup demo.** Sin LLM conectado. Presentar a
> dirección para conseguir aprobación de Fase 4 real (ADR-011, ADR-012).

### 5.1 Acceso

En los 5 perfiles web (Producción, Almacén, Operaciones, Cobranza,
Dirección) verás un **botón flotante rojo con la etiqueta `PRO`** en la
esquina inferior derecha. Es la burbuja del asistente.

Números pequeños en el botón = alertas urgentes pendientes.

En la Tablet de Línea **NO aparece** — decisión de spec: no interrumpir
al operador durante el turno.

### 5.2 Los 4 tabs del drawer

Al abrir la burbuja se despliega un panel lateral con 4 pestañas:

| Tab | Icono | Contenido |
|---|---|---|
| **Chat** | 💬 | Conversación con la IA sobre pedidos, líneas, operadores |
| **Alertas** | ⚠️ | Alertas automáticas priorizadas (alta/media/baja) |
| **Insights** | 📄 | Carta semanal del IA — top 3 oportunidades / riesgos / plan |
| **Pronósticos** | 📈 | Cumplimiento, OEE, demanda, carga proyectados |

### 5.3 Deep-linking (para presentaciones)

Agrega `?ia=chat`, `?ia=alerts`, `?ia=insights` o `?ia=forecasts` a la
URL del perfil para abrir el drawer directamente en ese tab. Ejemplo:

```
http://localhost:3000/produccion?ia=chat
```

### 5.4 Interacción demo

**En el chat:**

- Se cargan 2 conversaciones pregrabadas (EZE 503 · Stock Cubresuelo).
- Puedes escribir cualquier pregunta en el input — responde con "Modo
  demo" (aún no hay LLM real).
- Las respuestas pregrabadas incluyen:
  - Razonamiento (bloque gris)
  - Recomendaciones accionables con botón **"Aplicar"**

**En Alertas:**

- 5 alertas cargadas (2 altas, 2 medias, 1 baja)
- Cada una con `Título · Detalle · Razonamiento · [Atender] [Descartar]`

**En Insights:**

- 2 semanas cargadas (semana 21 y 20)
- Estructura: `Resumen · Top 3 oportunidades · Top 3 riesgos · KPIs ·
  Plan sugerido`

**En Pronósticos:**

- 4 cards: `Cumplimiento entregas (7d) · OEE por línea (14d) ·
  Demanda por familia (30d) · Carga operador (7d)`
- Gráficos SVG inline (donut + barras) sin librerías externas

### 5.5 Cuando dirección autorice Fase 4 real

Los componentes ya están (`src/components/ia/*`). Solo se reemplaza la
fuente de datos: `useApp().ai*` pasa a `useSWR('/api/ai/...')` y los
endpoints `/api/ai/*` llaman a Claude API con tool use. Ver
`docs/modulo-ia-consultiva.md` sección 9.

---

## 6. Flujos end-to-end

### Flujo 1 · Pedido nuevo (cliente → entrega)

```
1. Ventas registra el pedido en SAE                    [SAE]
2. Cobranza revisa pago                                [Cobranza · Panel]
3. Cobranza LIBERA el pedido                           [Cobranza · Liberar]
   ↓
4. Almacén ve el pedido en "Pendientes de egreso"      [Almacén · Panel]
5. Almacén SURTE el material → genera MT-DT-002        [Almacén · Egreso]
   ↓
6. Producción ve el pedido con material egresado       [Producción · Tablero]
7. Producción PROGRAMA a una línea + operador          [Producción · Iniciar]
   ↓
8. Operador FICHA turno en la tablet                   [Tablet · Empezar]
9. Operador ESCANEA rollo y TOCA piezas                [Tablet · +1]
10. Operador TERMINA orden                             [Tablet · Terminar]
    ↓
11. Producción VERIFICA pesaje (MT-DT-006)             [Producción · Pesaje]
12. Operaciones REGISTRA traspaso en SAE               [Operaciones · SAE]
    ↓
13. Pedido pasa a "entregado"
```

### Flujo 2 · Recepción de material (proveedor → almacén)

```
1. Proveedor entrega con Packing List                  [Físico]
2. Almacén VERIFICA Packing List vs físico             [Almacén · Recepción]
3. Almacén APLICA muestreo (1 de 5 rollos)             [Almacén · Muestreo]
4. Si PASA: registra en SAE (máx 1 día hábil)
   Si NO PASA: genera reclamo a proveedor              [Operaciones · Reclamos]
   ↓
5. Rollos quedan disponibles en inventario             [Almacén · Rollos]
```

### Flujo 3 · Reportar merma o defecto (operador → producción)

```
1. Operador detecta material perdido en la línea
2. En la Tablet: toca "⚠️ Reportar merma"              [Tablet · Merma]
3. Selecciona categoría (sobrante/defecto/desperdicio)
4. Indica los metros afectados
5. Opcional: foto de evidencia
6. Guardar → genera MT-DT-003
   ↓
7. Producción ve el registro en "Mermas y defectos"    [Producción · Mermas]
8. Si es defecto: Operaciones lo escala como reclamo   [Operaciones · Reclamos]
9. Si es sobrante: Almacén lo recibe de vuelta         [Almacén · Retorno]
```

### Flujo 4 · Verificación de pesaje (fin de producción)

```
1. Operador termina orden en la tablet                 [Tablet · Terminar]
2. Producción ve el pedido en "Pesaje final"           [Producción · Pesaje]
3. Producción pesa el rollo terminado
4. Compara con peso teórico (kg = anchoxlargo x gramaje)
5. Si Δ dentro de ±5%: marca "Verificado" ✓
   Si Δ >5%: detiene el producto, investiga con operador
6. Se genera MT-DT-006
```

---

## 7. Troubleshooting

### "No veo mi pedido"

- **Cobranza:** verifica que esté sin pago confirmado (aparece en
  `Por liberar`).
- **Almacén:** verifica que esté liberado por Cobranza. Si no, no aparece
  en `Pendientes de egreso`.
- **Producción:** verifica que el material esté egresado. Si no, sigue
  esperando a Almacén.
- **Operadores en tablet:** solo ven los pedidos asignados a su línea.

### "La tablet no me deja tocar +1 pieza"

- Revisa que estés fichado (tu avatar visible arriba a la derecha).
- Revisa que tu chip esté en rojo (el "operador activo") — si otro
  compañero está en rojo, tócate el chip tuyo para activarte.
- Si el pedido no tiene línea asignada, Producción tiene que asignarla
  primero.

### "Perdí mis datos al cerrar el navegador"

- Verifica que **no estés en modo incógnito** — `localStorage` no
  persiste ahí.
- Verifica que sea el mismo navegador y perfil de usuario del sistema
  operativo.
- Si tocaste "Reset demo" — los datos se limpiaron intencionalmente.

### "El escaneo de QR no funciona"

- En la versión demo el escaneo es simulado (toca en el visor para
  simular).
- En producción real: verifica permisos de cámara del navegador
  (Configuración → Sitio → Cámara → Permitir).

### "El botón IA Pro no aparece"

- Solo aparece en los 5 perfiles web (Producción, Almacén, Operaciones,
  Cobranza, Dirección).
- En la Tablet de Línea **no debe aparecer** (es intencional).
- Si no ves el botón en un perfil web: recarga la página.

### "Recibo un warning sobre localStorage"

- Es normal en modo incógnito o si el navegador tiene el storage lleno.
- El sistema sigue funcionando en memoria durante esta sesión, pero al
  cerrar se pierden los cambios.

### "Vi datos raros / anteriores"

- Toca **"Reset demo"** en el footer del selector de perfil para volver
  al estado inicial.
- Confirma en el diálogo — la operación no se puede deshacer.

---

## 8. Matriz de roles y responsabilidades

| Actividad | Cobranza | Almacén | Producción | Operador | Operaciones | Dirección |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Registrar pedido en SAE | | | | | R | I |
| Confirmar pago | **R** | | | | I | I |
| Liberar a producción | **R** | I | I | | I | I |
| Recibir material proveedor | | **R** | | | C | I |
| Muestreo calidad ingreso | | **R** | | | C | I |
| Egresar material | | **R** | I | | I | I |
| Asignar línea/operador | | | **R** | I | I | I |
| Fichar turno | | | I | **R** | | |
| Tocar piezas | | | I | **R** | | |
| Reportar avisos | | | I | **R** | | |
| Reportar mermas | | | I | **R** | I | |
| Verificar pesaje | | | **R** | I | I | I |
| Retornar sobrantes | | **R** | I | I | I | |
| Traspasos SAE | | I | I | | **R** | I |
| Auditar procesos | | I | I | I | **R** | I |
| Escalar reclamos proveedor | | I | I | | **R** | I |
| Aprobar KPIs mensuales | | I | I | | I | **R** |

**R** = Responsable · **C** = Consultado · **I** = Informado

---

## 9. Anexo — Página web pública mallatex.com.mx

Además del MES interno, este proyecto incluye un **rediseño propuesto
para la web pública** de Mallatex (`rediseno-web/index.html`).

### Estructura

One-pager con secciones ancladas:

1. **Hero** — "Protegemos lo que siembras" con KPIs y patrón malla SVG
2. **Clientes** — Driscoll's, Berrymex, NatureSweet, Bioparques…
3. **Cultivos** — segmentado por cultivo (berries, hortalizas, granos,
   aguacate, vivero, obra)
4. **Manifesto** — momento editorial "A la medida"
5. **Productos** — 5 familias (antigranizo, antiáfido, cubresuelo,
   monofilamento, raschel) + confección
6. **Promesa** — 4 razones sobre fondo rojo Mallatex
7. **Caso real** — Driscoll's Los Reyes 2,900 rollos (EZE 503)
8. **Cotizador** — formulario cualificado por cultivo
9. **Cobertura** — mapa con Zapopan + Ensenada
10. **CTA final** — cierre con opciones de contacto
11. **Footer**

### Cómo verla

- **Local:** `python3 -m http.server --directory rediseno-web 8000` → `http://localhost:8000`
- **Artifact:** https://claude.ai/code/artifact/ccacfedf-06f6-4565-8c88-e2417d45c01b

### Diseño

- **Mobile-first** (base 320px, breakpoints en 640/900/1200)
- 66 media queries `min-width`, 0 `max-width`
- Touch targets 44px WCAG 2.5.5
- Font-size 15px+ en inputs (evita autozoom iOS)
- Autocomplete en todos los campos del formulario
- Focus visible con outline rojo Mallatex
- Zero dependencias JS externas (self-contained)
- 52/52 checks de QA aprobados (`rediseno-web/qa.mjs`)

### Antes de publicar

- [ ] Validar cifra "3.4M m² en 2025" (placeholder)
- [ ] Validar "25+ años" (fundación asumida 1998)
- [ ] Reemplazar emails/teléfono placeholder por reales
- [ ] Confirmar que los sub-campos Driscoll's son públicos
- [ ] Opcional: reemplazar SVG generativo del hero/caso por fotografía
  real de Mallatex

---

## 10. Soporte

**Desarrollo y mantenimiento del sistema:**
Eduardo Gamboa · `ing.eduardogamboa@gmail.com`

**Reporte de bugs / mejoras:**
Documentar en `docs/decisions.md` (ADRs) o abrir issue en el repositorio.

**Actualizaciones del manual:**
Este documento se actualiza junto con el sistema. Última versión: v0.6.

---

*© 2026 · Manual de usuario Mallatex MES · Basado en los procesos formales
MT-PC-001, MT-PC-002, MT-PC-003 y el Manual de Organización MT-MA-001-Admon.*
