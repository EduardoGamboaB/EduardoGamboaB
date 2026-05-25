# Mallatex MES — Sistema de Gestión de Manufactura

> Manual del proyecto para Claude Code. Léete este archivo completo al iniciar
> cada sesión antes de modificar nada del código.

---

## 1. ¿Qué es este proyecto?

Sistema MES (Manufacturing Execution System) para **Tejidos Técnicos Mallatex
S.A. de C.V.**, fabricante mexicano de mallas agrotextiles a la medida con
planta en Zapopan, Jalisco y sucursal en Ensenada, B.C.

**Estado actual de Mallatex:** la operación se gestiona con archivos Excel
compartidos (planeación de pedidos, productividad por turno) y el ERP **SAE
(Aspel)**. Funciona pero ya no escala. Este proyecto digitaliza el piso de
producción y centraliza la información operativa que hoy vive dispersa entre
Excel, WhatsApp y memoria de los operadores.

**Objetivo del MVP:** demostrar valor en planta antes de invertir en una
implementación completa. Una sola persona desarrolla con Claude Code.

---

## 2. Documentos formales del cliente

El sistema **debe** alinearse a los procesos formalmente documentados en los
archivos del cliente:

- **MT-MA-001-Admon** — Manual de Organización (misión, visión, valores,
  organigrama, perfiles de puesto)
- **MT-PC-001-2026** — Proceso de Ingreso de material (29 actividades)
- **MT-PC-002-2026** — Proceso de Egreso de material (17 actividades)
- **MT-PC-003-2026** — Proceso de Producción (53 actividades)

Documentos asociados que la aplicación digitaliza:

- **MT-DT-001** — Recepción de material (proceso de ingreso)
- **MT-DT-002** — Egreso de material a producción
- **MT-DT-003** — Control de material en producción
- **MT-DT-004** — Conteo de rollos (usado, sobrante, defecto)
- **MT-DT-005** — Retorno de material a almacén
- **MT-DT-006** — Check list de producto terminado (pesaje)

Cada vista de cobranza, almacén, producción y operaciones lleva un tag
`<ProcessTag code="MT-PC-XXX"/>` que ancla esa pantalla al proceso formal
correspondiente. **Mantén este patrón** al agregar funcionalidad nueva.

---

## 3. Identidad de marca (NO modificar)

Mallatex tiene identidad visual definida. **Cualquier cambio de color, tipografía
o logo necesita aprobación expresa del usuario antes de tocar código.**

### Colores

- **Rojo primario: `#E30613`** (NO verde, NO azul)
- Rojo oscuro: `#B30410`
- Rojo claro (acento sobre blanco): `#FFE5E7`
- Ink (texto principal, NO negro puro): `#1a1a1a`
- Black (solo para `brand.black` en componentes históricos): `#0a0a0a`
- White: `#ffffff`
- Paper (fondo base): `#fafafa`
- Paper2 (fondo secundario): `#f0f0f0`
- Line (bordes): `#e0e0e0`
- OK: `#1e8a3c`
- Warn: `#f5a623`
- Bad: `#E30613` (= rojo Mallatex)

### Tipografía

- **Display:** Barlow Condensed (todos los pesos, incluye itálica) — usar
  en titulares, números grandes, badges, todo lo en MAYÚSCULAS
- **Body:** Barlow — texto corrido, descripciones
- **Mono:** JetBrains Mono — códigos de proceso, metadatos, fechas, IDs,
  letterspacing alto

Las fuentes se cargan desde Google Fonts en el `useEffect` del componente
`App`. NO migrar a Tailwind ni cambiar a otra fuente sans-serif sin avisar.

### Logos

Hay dos PNG en base64 embebidos como constantes `LOGO_FULL_URL` (wordmark
completo "MALLATEX") y `LOGO_SYMBOL_URL` (símbolo de anillos concéntricos).
**No los reemplaces ni reduzcas.** Si necesitas extraerlos a archivos
separados, copia el base64 íntegro a `/public/logos/mallatex-full.txt` y
`/public/logos/mallatex-symbol.txt` y léelos desde ahí.

### Paleta sin negros

A decisión expresa del usuario, **el sistema NO usa fondos negros**. La
estética es blanco/papel con rojo Mallatex como acento. Cualquier
`background: brand.black` o `background: '#0X...'` que aparezca debe
reemplazarse por blanco con borde rojo, o rojo con texto blanco.

---

## 4. Arquitectura de los 6 perfiles

El sistema tiene exactamente **6 perfiles operativos**. No agregar uno sin
discutirlo primero.

### 4.1. Tablet de Línea (`/app/tablet`)

Es la pantalla fija en cada máquina del piso de producción.

- **Una tablet por línea** (LC1, LC2, LC3, LC4, LK, LP, LE)
- Al instalarse, la tablet selecciona qué línea es (configuración única)
- **Multi-operador simultáneo:** varios operadores pueden estar fichados en
  la misma línea al mismo tiempo. El que está tocando piezas en este momento
  aparece resaltado en rojo. Hay un botón `+` para sumar más operadores
- Flujos: fichar/desfichar operadores, escanear rollo (QR), sumar pieza,
  reportar problema, reportar merma/defecto, terminar orden
- Implementa MT-PC-003 actividades 7-23

### 4.2. Producción (`/app/produccion`) — Carlos A.

Jefe de Producción. Implementa MT-PC-003.

Vistas: Tablero general, Bitácora de pedidos (reemplaza Excel
PLANEACION_DE_PEDIDOS), Productividad por turno (reemplaza Excel
Sistema_de_productividad), Planificación, Líneas, Asignaciones de operadores,
Avisos urgentes, Pesaje final, Mermas y defectos, Documentos MT-DT-003/004/006

### 4.3. Almacén (`/app/almacen`) — Alberto O.

Implementa MT-PC-001 (Ingreso) + MT-PC-002 (Egreso).

Vistas: Panel, Recepción de material, Muestreo de calidad, Egreso a
producción, Retorno de sobrantes, Inventario de rollos, Ubicaciones

### 4.4. Operaciones (`/app/operaciones`) — Víctor G.

Coordinador general. Vista transversal de los 3 procesos.

Vistas: Panel, Sincronización SAE, Auditoría, Reclamos de calidad,
Devoluciones, Documentos

### 4.5. Cobranza (`/app/cobranza`) — María L.

Libera pedidos a producción cuando el pago está confirmado.

Vistas: Panel, Pedidos pendientes de liberación, Liberados, Historial

### 4.6. Dirección (`/app/direccion`) — Víctor F. G.

KPIs ejecutivos. Lee, no escribe.

Vistas: Tablero ejecutivo, KPIs MT-PC-001, KPIs MT-PC-002, KPIs MT-PC-003,
Productividad (datos reales), Costos, Pedidos SAE

---

## 5. Datos reales extraídos de Excel

Los datos simulados en `initialOrders`, `initialOperators` y
`initialProductividad` **NO son inventados**. Vienen del Excel histórico del
cliente. Mantén la realidad operativa al agregar datos:

### Códigos de pedido (prefijos reales)

`EZE`, `FEL`, `VEG`, `VFGC`, `POCC`, `PSOP`, `PGTE`, `PNTE`. No inventar
otros sin razón.

### Clientes reales (26)

Driscolls, Berrymex, NatureSweet, Bioparques, Agro Viva, Agronegocios Aran,
Horticola Heres, Pimientos Selectos, Bell Pepper Lovers, Productora Hassiba,
Natural Food Planet, Productores HRG, Tecnologia Agricola Productiva,
General Fresh, La Cima Produce, Surexport, ABA Berries, ABA Frutillas,
Agricola El Rincon de las Palmas, Agricola Gloria Lilia, Avicola Glez Glez,
Construcciones y Tuberias del Centro, Gabriel Vargas Cisneros, Lorena Pelayo
de Jesus, Ventas al Publico, Agronatura Supply.

### Líneas reales con códigos

| ID  | Nombre       | Proceso       | Emoji |
| --- | ------------ | ------------- | ----- |
| LC1 | Costura 1    | costura       | 🧵    |
| LC2 | Costura 2    | costura       | 🧵    |
| LC3 | Costura 3    | costura       | 🧵    |
| LC4 | Costura 4    | costura       | 🧵    |
| LK  | Corte        | corte         | ✂️    |
| LP  | Perforadora  | perforacion   | 🔨    |
| LE  | Embobinado   | embobinado    | 📦    |

### Operadores reales con promedios mL/hr históricos

| Operador | Línea | Tipo | mL/hr |
| -------- | ----- | ---- | ----- |
| Karen    | LC1   | A    | 213   |
| Lorena   | LC2   | A    | 218   |
| Jesus    | LC3   | B    | 231   |
| Carmen   | LC4   | A    | 210   |
| Erik     | LK    | D    | 491   |
| Nayeli   | LP    | B    | 566   |
| Eva      | LE    | C    | 486   |
| Juan     | LE    | B    | 714   |
| Sarai    | LC3   | A    | 120   |
| Fátima   | LC4   | A    | 200   |

Personal administrativo (no operador): Néstor (montacargas), Carlos A.
(jefe producción), Alberto O. (almacén), Víctor G. (operaciones), María L.
(cobranza), Víctor F. G. (director).

### Tipos de operador (MT-PC-003 política 2)

- **A** — Costura básica (una operación)
- **B** — Dos operaciones
- **C** — Tres operaciones
- **D** — Polivalente (todas las operaciones)

Determina qué máquinas/procesos puede operar.

### Materiales reales del catálogo

ANTIAFIDO 10x16/10x20/12x22 CRISTAL, ANTIGRANIZO NEGRA, CUBRESUELO
AZORRILLADO/BLANCO/NEGRO 105GR, CUBRESUELO BLANCO 130, MALLA RASCHEL 35%
BLANCA, MONOFILAMENTO 70% NEGRO, MONOFILAMENTO 90% NEGRO, RASCHEL 50% NEGRO.

### Estados de pedido reales

`EN PRODUCCION`, `ENTREGADO`, `TERMINADO`, `DETENIDO`. El flujo interno del
sistema agrega también: `cobranza-pendiente`, `liberado`, `stock-faltante`,
`compra-pendiente`, `material-egresado`.

### Formas de entrega reales (5)

ALMACEN, MALLATEX, MALLATEX envía campo, TRES GUERRAS, PAQUETERIA.

### Categorías de material (MT-PC-003 política 8)

- **Materia prima** — Material nuevo recién egresado de almacén
- **Sobrante** — Material útil que regresa al inventario (reciclable)
- **Defecto** — Material con defecto recuperable (reproceso)
- **Desperdicio** — Material no recuperable (merma final)

### Hallazgo crítico: sub-pedidos

El pedido **EZE 503 de Driscolls (2,900 rollos de antigranizo negra 11.10 ×
50)** está dividido en sub-campos: Egipto, San Francisco, Atenco, San Jose,
Cabaña. Es un caso real de mega-pedido. El modelo de datos debe soportar
`order.subPedidos[]` con avance independiente por sub-campo.

---

## 6. Stack técnico

- **Next.js 14+** con App Router
- **React** funcional con hooks (useState, useEffect, useMemo, useContext)
- **lucide-react** para iconos
- **Estilos inline** (style={{...}}) — NO Tailwind, NO CSS modules,
  NO styled-components. Es decisión deliberada para mantener el archivo
  monolítico portable y permitir copia-pega de componentes
- **localStorage** para persistencia del demo
- Más adelante: API routes de Next.js para conexión con SAE de Aspel

### Estado global

Vive en `AppContext` (en `/lib/context.js` después del refactor). Provee:

- `orders, rolls, avisos, mermas, recepciones, egresos, productosTerminados,
  productividad, operators, currentTime`
- `updateOrder, updateRoll, addAviso, addMerma, addRecepcion, addEgreso,
  addProductoTerminado, addProductividad, liberarPedido`

Mantén esta API. Si necesitas más métodos, agrégalos al provider.

---

## 7. Tendencias UX/UI 2026 aplicadas (mantener)

El diseño actual implementa varios principios que **NO degradar** en refactor:

- **Bento Box Layout** — tarjetas modulares en el menú lateral y secciones
- **Emojis universales** redundantes con iconos lucide (📊⚠️🔄🛡️🧵✂️🔨📦)
  porque los operadores tienen niveles variables de alfabetización; el
  emoji + color + label es triple redundancia visual
- **Touch targets** mínimos 60px de alto, ideales 100px+ en tablet
- **Microinteracciones** con animación `hint-pulse` que guía la mirada al
  primer ítem cada vez que entras a una vista
- **ProfileHeader persistente** con avatar de la persona dueña del perfil,
  para que sepan "esta soy yo, este es mi rol"
- **Color = información** (estado del pedido por color, no solo por texto)
- **Sin fondos negros** — fondo blanco/paper, rojo Mallatex como acento

---

## 8. Convenciones de código

- **Componentes en PascalCase**, archivos en PascalCase.jsx (excepto pages
  de Next.js que son `page.jsx`)
- **Constantes en UPPER_SNAKE_CASE** (ROLES, ESTADOS_PEDIDO, LINEAS_REALES,
  EMOJI_LINEA, EMOJI_PROCESO, PROCESOS_PRODUCCION, CATEGORIAS_MATERIAL)
- **Hooks personalizados con prefijo `use`** (useApp)
- **Avoid premature abstraction.** Inline styles repetidos están bien si
  son legibles. Solo extraer a componente cuando se usa 3+ veces
- **Idioma:** comentarios y strings de UI en **español**, identificadores
  en código en **inglés** o español según el dominio (orders, rolls vs
  pedido, rollo — aceptable mezclar si refleja la terminología del
  cliente)
- **Sin comentarios obvios.** No comentar lo que el código ya dice. Solo
  comentar el "por qué" cuando no es evidente
- **Cero dependencias nuevas sin avisar.** Antes de `npm install algo`,
  preguntar al usuario

---

## 9. Cómo trabajamos juntos

- **Cambios pequeños y revisables.** No reescribir 500 líneas en un solo
  mensaje. Si una tarea es grande, partirla en pasos visibles
- **Validar antes de modificar.** Antes de cambiar `app/page.jsx`,
  preguntar al usuario "¿cómo quieres que se vea?" o mostrar 2 opciones
- **Mantener el archivo `app/page.jsx` ejecutable en todo momento.** Si una
  refactor lo rompe temporalmente, terminar la refactor en la misma sesión
- **Documentar decisiones de diseño en `/docs/decisions.md`** (ADR ligero)
  cuando se tome una decisión arquitectónica que el futuro yo agradecerá
- **Antes de pedir un cambio "completo", el usuario primero arma el contexto
  con mensajes preparatorios.** Si recibes "ahora hazlo", primero confirma
  qué entendiste antes de escribir código

---

## 10. Roadmap actual (donde estamos hoy)

**Hecho:**

- ✅ Análisis del Manual de Organización y los 3 procesos formales
- ✅ Extracción de datos reales de los 3 Excel del cliente
- ✅ Diseño UX/UI aplicado a los 6 perfiles
- ✅ Prototipo navegable en archivo monolítico `app/page.jsx` (2,631 líneas)
- ✅ Migración a Claude Code

**Inmediato (esta semana):**

1. Refactor del monolito en estructura modular
2. Persistencia en localStorage
3. Demo presentable a dirección con datos reales

**Próximas 2-3 semanas:**

4. Hoja de propuesta formal a dirección (cotización por fases, ROI)
5. Plantillas docx de los 6 documentos MT-DT (formatos físicos)
6. Wireframes navegables HTML estáticos para presentación

**Backlog:**

- Sincronización con SAE de Aspel (la pieza más importante a futuro)
- Sistema de autenticación real (hoy es selector de perfil)
- Auditoría/log de cambios
- Notificaciones push entre perfiles (operador → producción → almacén)
- Reportes exportables (PDF/Excel) por perfil
- Multi-planta (sucursal Ensenada)
- App nativa para tablets (PWA primero, nativa después si justifica)

---

## 11. Personas reales del cliente

Cuando trabajes con datos personales en código (placeholders, asignaciones,
ejemplos), usa los nombres reales del Manual de Organización:

- **Víctor F. Gamboa Castro** — Director / autoriza documentos
- **Víctor E. Gamboa Gandara** — Revisa documentos
- **Carlos A.** — Jefe de Producción
- **Alberto O.** — Almacén
- **Víctor G.** — Operaciones
- **María L.** — Cobranza
- **Néstor** — Montacargas

---

## 12. Datos de la empresa

- **Razón social:** Tejidos Técnicos Mallatex S.A. de C.V.
- **Planta principal:** Av. El Colli #5210, Col. Colli Urbano, C.P. 45070,
  Zapopan, Jalisco
- **Sucursal:** Ensenada, Baja California
- **Web:** www.mallatex.com.mx
- **Tagline oficial:** "PROTEGEMOS LO QUE SIEMBRAS"
- **Misión:** Diseñar y proveer mallas agrícolas a la medida que mejoren el
  rendimiento de los cultivos
- **Visión:** Ser empresa líder en soluciones agrícolas personalizadas

---

## 13. Antes de cerrar la sesión

Cada vez que termines una tarea significativa, recuérdale al usuario:

1. Hacer commit con mensaje descriptivo
2. Probar el flujo end-to-end del perfil afectado
3. Si hay cambio en la API del contexto, actualizar la sección 6 de este
   archivo
4. Si hay decisión arquitectónica, anotarla en `/docs/decisions.md`
