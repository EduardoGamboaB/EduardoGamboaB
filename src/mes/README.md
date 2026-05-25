# Mallatex MES · módulo `src/mes`

Refactor del prototipo `MallatexMES-v6.jsx` (2 631 líneas, 7 perfiles
combinados en un solo archivo) hacia una arquitectura modular Next.js
con un archivo por responsabilidad.

## Mapa de módulos

```
src/mes/
├── lib/
│   ├── brand.ts        Tokens de marca (colores, fuentes, logo URLs)
│   ├── constants.ts    ROLES · OPERATOR_TYPES · PROCESOS · CATEGORIAS_MATERIAL
│   │                   · ESTADOS_PEDIDO · FORMAS_ENTREGA · CLIENTES_REALES
│   │                   · LINEAS_REALES · EMOJI_* · ROLE_PROFILES
│   ├── seed.ts         Datos demo: operators, orders, rolls, recepciones,
│   │                   egresos, mermas, productividad, productos terminados
│   ├── format.ts       formatTime · formatDate
│   └── store.tsx       AppProvider + useApp (Context React)
├── components/
│   ├── brand/
│   │   ├── Logo.tsx           ↔ MallatexLogo
│   │   └── MESLogo.tsx        ↔ MallatexMESLogo
│   ├── ui/
│   │   ├── BigButton.tsx      Touch target operador (≥64 px)
│   │   ├── Counter.tsx        Contador grande (+/-)
│   │   ├── Badge.tsx          Pill ok/warn/bad/red/dark
│   │   ├── ProcessTag.tsx     Etiqueta MT-PC-NNN
│   │   ├── OrderStatusPill.tsx
│   │   └── BentoCard.tsx      (incluye BentoSection)
│   ├── shell/
│   │   ├── WebShell.tsx       Sidebar + main
│   │   ├── ProfileHeader.tsx
│   │   ├── Topbar.tsx
│   │   ├── Btn.tsx            Botón de acción (dark/primary/ok/ghost)
│   │   ├── Stat.tsx           Tarjeta KPI
│   │   ├── Panel.tsx          Sección con título
│   │   ├── Chip.tsx
│   │   └── Table.tsx          Tabla básica
│   └── tablet/
│       ├── TabletFrame.tsx    Marco 16:10 con boton "cambiar perfil"
│       ├── TabletHeader.tsx   Header + fichado de operadores + StatusBar
│       ├── AlertScreen.tsx    8 botones de aviso (falla, sin material…)
│       └── MermaScreen.tsx    Categoría + defecto + Counter
└── screens/                   Una pantalla por perfil — cada una usa los
    ├── ProfileSelector.tsx     bloques anteriores; estado interno con
    ├── TabletLineaApp.tsx      `useState` para alternar entre vistas.
    ├── ProduccionApp.tsx
    ├── AlmacenApp.tsx
    ├── OperacionesApp.tsx
    ├── CobranzaApp.tsx
    └── DirectorApp.tsx
```

## Routing Next.js

```
src/app/mes/
├── layout.tsx                 AppProvider + fuentes Barlow + keyframes
├── page.tsx                   → ProfileSelector
├── tablet/page.tsx            → TabletLineaApp
├── produccion/page.tsx        → ProduccionApp
├── almacen/page.tsx           → AlmacenApp
├── operaciones/page.tsx       → OperacionesApp
├── cobranza/page.tsx          → CobranzaApp
└── director/page.tsx          → DirectorApp
```

El selector navega con `useRouter().push('/mes/<perfil>')` y cada perfil
sale con `router.push('/mes')`. El `AppProvider` rodea todas las rutas
para que los datos demo se compartan entre sesiones.

## Diferencias respecto al prototipo

- **Tipado**: convertido a TypeScript con interfaces para `Order`, `Roll`,
  `Operator`, `Aviso`, `Merma`, `Recepcion`, `Egreso`, `ProductoTerminado`,
  `Productividad`.
- **Logos**: `data:image/png;base64,…` → archivos en `public/brand/`
  (cachean en CDN, JS bundle baja ~24 KB).
- **Tipografías**: el `useEffect` que inyectaba `<link>` y `<style>` ahora
  vive en `src/app/mes/layout.tsx` como nodos SSR estáticos.
- **Navegación**: `useState('profile')` → rutas Next.js. Permite enlace
  directo, back del navegador y compartir URL.
- **Estilos**: se preservan los inline styles del prototipo (mantienen
  la identidad visual). Se pueden migrar progresivamente a Tailwind
  reutilizando los tokens en `lib/brand.ts`.
- **Coexistencia**: el MES vive en `/mes/…` sin tocar la Mallatex
  Production Suite original (`/dashboard`, `/pedidos`, etc.).

## Cómo agregar una pantalla nueva

1. Componer la pantalla en `src/mes/screens/<NuevaApp>.tsx` usando los
   átomos de `ui/` y `shell/`.
2. Crear `src/app/mes/<ruta>/page.tsx` con `export default` que renderice
   la pantalla.
3. (opcional) Agregar la tarjeta correspondiente en
   `screens/ProfileSelector.tsx`.

## Datos

Por ahora los datos demo viven en `lib/seed.ts` y se mantienen en memoria
vía Context. Para conectar a backend real:

1. Reemplazar el `useState(initial…)` de `store.tsx` por `useSWR`/`useQuery`
   apuntando a endpoints REST o Server Actions.
2. Las mutaciones (`updateOrder`, `addMerma`, etc.) deben llamar al backend
   y refrescar la cache.

Los modelos Prisma de la Mallatex Production Suite (`prisma/schema.prisma`)
ya cubren la mayoría de entidades; faltaría exponer endpoints REST
específicos para SAE, recepciones MT-DT-001 y egresos MT-DT-002.
