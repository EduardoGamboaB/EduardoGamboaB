# Mallatex MES

Sistema MES (Manufacturing Execution System) para **Tejidos Técnicos
Mallatex S.A. de C.V.** — planta Zapopan, Jal. y sucursal Ensenada, B.C.

> **Estado:** v0.6 · prototipo navegable con datos reales del cliente.
> Ver `docs/manual-usuario.md` para el manual completo y `CLAUDE.md`
> para las convenciones al modificar código.

---

## ¿Qué contiene?

- **6 perfiles** operativos (Tablet de Línea, Producción, Almacén,
  Operaciones, Cobranza, Dirección) alineados con los procesos formales
  MT-PC-001/002/003 y el Manual de Organización MT-MA-001.
- **Datos reales** extraídos del Excel del cliente (`PLANEACION_DE_PEDIDOS`,
  `Sistema_de_productividad`) — clientes, operadores, líneas, mermas,
  productividad histórica.
- **Persistencia local** en `localStorage` con versionado y botón "Reset
  demo".
- **Módulo IA Consultiva Pro** (Fase 4 · mockup demo sin LLM real):
  chat, alertas, insights semanales, pronósticos.
- **Rediseño propuesto de la web pública** (`rediseno-web/`) mallatex.com.mx.
- **Manual de usuario completo** en `docs/manual-usuario.md`.

## Stack

- Next.js 14 (App Router)
- React 18 funcional con hooks
- lucide-react para iconos
- **Estilos inline** con tokens en `src/lib/brand.js` — ADR-002
- **JavaScript** puro (no TypeScript) — ADR-009

## Arrancar

```bash
cd mallatex-mes
npm install
npm run dev
# http://localhost:3000
```

Para producción:

```bash
npm run build && npm run start
```

Con Docker:

```bash
docker build -t mallatex-mes .
docker run -p 3000:3000 mallatex-mes
```

## Rutas

```
/             ProfileSelector · 6 perfiles
/tablet       Tablet de Línea · operadores
/produccion   Jefe de Producción · Carlos A.
/almacen      Almacén · Alberto O.
/operaciones  Coordinador · Víctor G.
/cobranza     Cobranza · María L.
/direccion    Dirección · Víctor F. G.

Deep-link IA Pro en cualquier perfil web:
/produccion?ia=chat|alerts|insights|forecasts
```

## Estructura

```
mallatex-mes/
├── src/
│   ├── app/                     Next.js App Router (7 rutas)
│   ├── lib/                     brand, constants, data, context, storage
│   └── components/
│       ├── logos/               MallatexLogo · MallatexMESLogo
│       ├── ui/                  13 componentes atómicos
│       ├── shell/               WebShell (sidebar bento + IA bubble)
│       ├── selector/            ProfileSelector
│       ├── tablet/              TabletLineaApp + alert/merma screens
│       ├── apps/                5 role-apps
│       └── ia/                  Módulo IA Pro (Fase 4 · mockup)
├── public/logos/                PNG oficiales Mallatex
├── docs/
│   ├── decisions.md             ADR-001 a ADR-012
│   ├── manual-usuario.md        Manual completo v0.6
│   ├── modulo-ia-consultiva.md  Spec Fase 4
│   └── qa/validation.mjs        QA estructural
├── rediseno-web/                Rediseño mallatex.com.mx (proyecto aparte)
├── CLAUDE.md                    Instrucciones para futuras sesiones
├── package.json
├── Dockerfile
└── README.md
```

## Documentos formales del cliente

El sistema digitaliza los procesos:

- **MT-PC-001-2026** — Ingreso de material (29 actividades)
- **MT-PC-002-2026** — Egreso de material (17 actividades)
- **MT-PC-003-2026** — Producción (53 actividades)
- **MT-DT-001..006** — Formatos físicos asociados

Cada vista lleva `<ProcessTag code="MT-PC-XXX"/>` que ancla la pantalla
al proceso correspondiente.

## Entregables publicados

- Manual de usuario: https://claude.ai/code/artifact/43c17f68-15f5-4afa-87c6-9ab391abc176
- Rediseño web pública: https://claude.ai/code/artifact/ccacfedf-06f6-4565-8c88-e2417d45c01b

## Contacto

Eduardo Gamboa · [ing.eduardogamboa@gmail.com](mailto:ing.eduardogamboa@gmail.com)
