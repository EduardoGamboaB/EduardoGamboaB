# Mallatex MES

Sistema MES (Manufacturing Execution System) para **Tejidos Técnicos Mallatex
S.A. de C.V.** — planta Zapopan, Jalisco.

> Lee `CLAUDE.md` antes de modificar nada. Las decisiones arquitectónicas
> viven en `docs/decisions.md`.

## Stack

- Next.js 14 (App Router)
- React funcional con hooks
- lucide-react para iconos
- **Estilos inline** (`style={{...}}`) con tokens en `src/lib/brand.js` — ADR-002
- **JavaScript** (no TypeScript) — ADR-009

## Arrancar

```bash
npm install
npm run dev
# http://localhost:3000
```

## Rutas

```
/             ProfileSelector — 6 perfiles
/tablet       Tablet de Línea (operadores)
/produccion   Jefe de Producción · Carlos A.
/almacen      Almacén · Alberto O.
/operaciones  Coordinador · Víctor G.
/cobranza     Cobranza · María L.
/direccion    Dirección · Víctor F. G.
```

## Estructura

```
src/
├── app/                       Next.js App Router
│   ├── layout.jsx             AppProvider + Google Fonts
│   ├── globals.css            keyframes pulse, scan, hint-pulse
│   ├── page.jsx               → ProfileSelector
│   └── [perfil]/page.jsx      una por cada perfil
├── lib/
│   ├── brand.js               tokens (colores, fuentes, logos)
│   ├── constants.js           ROLES, LINEAS_REALES, EMOJI_*, ROLE_PROFILES
│   ├── data.js                datos demo extraídos del Excel real
│   ├── context.jsx            AppProvider + useApp + formatTime/formatDate
│   └── utils.js               helpers puros
└── components/
    ├── logos/                 MallatexLogo, MallatexMESLogo
    ├── ui/                    BigButton, Counter, Badge, ProcessTag,
    │                          OrderStatusPill, BentoCard, ProfileHeader,
    │                          Topbar, Btn, Stat, Panel, Chip, Table
    ├── shell/                 WebShell (sidebar bento + main)
    ├── selector/              ProfileSelector
    ├── tablet/                TabletLineaApp + AlertTabletScreen + MermaTabletScreen
    └── apps/                  5 role-apps (Produccion, Almacen, Operaciones,
                               Cobranza, Director)
```

## Documentos formales

El sistema digitaliza los procesos formales del cliente:

- **MT-PC-001-2026** — Ingreso de material
- **MT-PC-002-2026** — Egreso de material
- **MT-PC-003-2026** — Producción
- **MT-DT-001..006** — Formatos físicos asociados

Cada vista lleva `<ProcessTag code="MT-PC-XXX"/>` que ancla la pantalla
al proceso correspondiente.
