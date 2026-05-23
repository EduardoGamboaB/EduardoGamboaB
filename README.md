# Mallatex Production Suite

Suite de control de producción para **Mallatex** — agrotextiles para agricultura protegida.

Aplicación web + móvil **adaptativa y responsiva** (PWA) para el registro de producción de pedidos de:

- Mallas agrícolas (sombra, tutoreo, soporte)
- Cubre suelos (ground cover, mulch)
- Mallas antiáfidos / antiinsectos
- Mantas térmicas y agrotextiles
- Cualquier insumo de agricultura protegida

## Tabla de contenido

- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Branding Mallatex](#branding-mallatex)
- [Módulos](#módulos)
- [Puesta en marcha](#puesta-en-marcha)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Roadmap](#roadmap)

## Arquitectura

```
                ┌──────────────────────────────────────────┐
                │           Mallatex Production Suite      │
                └──────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼─────────────────────────────┐
        │                           │                             │
   ┌────▼─────┐              ┌──────▼──────┐               ┌──────▼──────┐
   │  Web App │              │  Mobile PWA │               │  REST API   │
   │ (Desktop)│              │ (Operarios) │               │  Next.js    │
   └────┬─────┘              └──────┬──────┘               └──────┬──────┘
        │                           │                             │
        └───────────────┬───────────┘                             │
                        │                                         │
                  ┌─────▼──────────────────────────────────────────▼─────┐
                  │              Capa de servicios (Server Actions)      │
                  │   Pedidos · Producción · Catálogo · Inventario · QC │
                  └─────────────────────┬────────────────────────────────┘
                                        │
                                ┌───────▼────────┐
                                │   Prisma ORM   │
                                └───────┬────────┘
                                        │
                                ┌───────▼────────┐
                                │  PostgreSQL    │
                                │  (SQLite dev)  │
                                └────────────────┘
```

La misma aplicación Next.js sirve **escritorio (gerencia / supervisión)** y **móvil (operarios en planta)** mediante diseño **mobile-first responsivo**, con navegación lateral en desktop y barra inferior en móvil. Instalable como PWA para uso en tablets industriales y teléfonos de campo.

## Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Next.js 14 (App Router)** + TypeScript | SSR/RSC, API integrada, PWA, despliegue universal |
| Estilos | **Tailwind CSS** + tokens Mallatex | Mobile-first, consistencia con branding |
| ORM | **Prisma** | Type-safe, migraciones reproducibles |
| Base de datos | **PostgreSQL** (prod) / **SQLite** (dev) | Escalable, sin lock-in |
| Autenticación | **NextAuth (Auth.js)** | Roles: admin · supervisor · operario |
| Validación | **Zod** + react-hook-form | Validación end-to-end |
| Gráficas | **Recharts** | Dashboard de KPIs de producción |
| PWA | **next-pwa** + service worker | Trabajo offline en planta |
| Tests | **Vitest** + **Playwright** | Unit + E2E |
| Despliegue | **Docker** + GitHub Actions | Portable a cualquier nube |

## Branding Mallatex

Ver [`docs/BRANDING.md`](docs/BRANDING.md) para la guía visual completa.

| Token | Hex | Uso |
|---|---|---|
| `mallatex-green-700` | `#2D7A3E` | Color primario · CTA · header |
| `mallatex-green-500` | `#4CAF50` | Estados éxito · iconos |
| `mallatex-green-100` | `#E8F5E9` | Fondos suaves |
| `mallatex-earth-700` | `#5D4037` | Texto sobre verde |
| `mallatex-sun-500`   | `#FFA726` | Acentos · alertas · cosecha |
| `mallatex-sky-500`   | `#29B6F6` | Información · enlaces |
| `mallatex-soil-900`  | `#1B1B1B` | Texto principal |

> Los logotipos oficiales deben colocarse en `public/brand/` extraídos de https://mallatex.com.mx — esta suite incluye un logotipo SVG placeholder que respeta la paleta corporativa.

## Módulos

### 1. Dashboard
KPIs en tiempo real: producción del día/semana, OEE por máquina, pedidos atrasados, eficiencia por turno, stock crítico.

### 2. Pedidos
- Alta de pedidos con cliente, fecha compromiso, productos (con especificaciones técnicas: ancho, gramaje, color, % sombra, etc.).
- Estado: borrador · confirmado · en producción · terminado · entregado.
- Generación de orden de producción y hoja de ruta.

### 3. Producción
- **Registro móvil**: el operario escanea el pedido (QR) y registra lote, máquina, turno, metros lineales producidos, mermas, paros (motivos).
- Soporta producción por **lotes** y por **rollo individual** con etiquetado.
- Trazabilidad raw material → rollo terminado.

### 4. Catálogo
- Productos (familia, SKU, especificaciones técnicas configurables por familia).
- Familias: malla sombra, antigranizo, antipájaros, antiáfidos, cubre suelos, mantas térmicas, rafia.
- Clientes, proveedores, materias primas (HDPE, polipropileno, aditivos UV).

### 5. Inventario
- Stock multi-almacén (materia prima, producto en proceso, producto terminado).
- Movimientos: entradas, salidas, traspasos, mermas.
- Alertas de stock mínimo.

### 6. Calidad
- Checklist por familia de producto.
- Registro de defectos por rollo / lote.
- Liberación de lote para entrega.

### 7. Reportes
- Producción por periodo / máquina / operario / producto.
- OEE (Disponibilidad × Rendimiento × Calidad).
- Costos por orden de producción.
- Exportación a Excel / PDF.

## Puesta en marcha

### Requisitos
- Node.js 20+
- pnpm 9+ (o npm/yarn)
- Docker (opcional, para PostgreSQL)

### Instalación

```bash
# 1. Clonar e instalar
git clone https://github.com/EduardoGamboaB/EduardoGamboaB.git mallatex-suite
cd mallatex-suite
pnpm install

# 2. Configurar entorno
cp .env.example .env
# Edita .env con tu DATABASE_URL y NEXTAUTH_SECRET

# 3. Inicializar la base de datos
pnpm prisma migrate dev
pnpm prisma db seed

# 4. Arrancar en modo desarrollo
pnpm dev
# Abre http://localhost:3000
```

### Con Docker (recomendado para producción)

```bash
docker compose up -d
# App en http://localhost:3000
# Postgres en localhost:5432
```

### Credenciales de demo (tras seed)

| Rol | Email | Password |
|---|---|---|
| Admin | `admin@mallatex.mx` | `mallatex2026` |
| Supervisor | `supervisor@mallatex.mx` | `mallatex2026` |
| Operario | `operario@mallatex.mx` | `mallatex2026` |

## Estructura del repositorio

```
mallatex-suite/
├── prisma/
│   ├── schema.prisma          # Modelo de datos completo
│   └── seed.ts                # Datos demo (productos Mallatex)
├── public/
│   ├── manifest.webmanifest   # PWA manifest
│   └── brand/                 # Logotipo y favicons
├── src/
│   ├── app/                   # Rutas Next.js (App Router)
│   │   ├── (auth)/login/      # Pantalla de acceso
│   │   ├── (app)/             # Shell autenticado
│   │   │   ├── dashboard/
│   │   │   ├── pedidos/
│   │   │   ├── produccion/
│   │   │   ├── catalogo/
│   │   │   ├── inventario/
│   │   │   └── reportes/
│   │   └── api/               # Endpoints REST
│   ├── components/
│   │   ├── shell/             # Sidebar, BottomNav, Header
│   │   ├── ui/                # Botón, Input, Card, Tabla
│   │   └── modules/           # Componentes por módulo
│   ├── lib/
│   │   ├── db.ts              # Cliente Prisma
│   │   ├── auth.ts            # NextAuth config
│   │   └── utils.ts
│   └── types/
├── docs/
│   ├── ARQUITECTURA.md
│   ├── BRANDING.md
│   └── ROADMAP.md
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## Roadmap

- [x] Modelo de datos completo (Prisma)
- [x] Shell responsivo (sidebar desktop + bottom nav móvil)
- [x] Pantalla de login con roles
- [x] Dashboard con KPIs
- [x] CRUD de pedidos
- [x] Registro de producción (mobile-friendly)
- [x] Catálogo de productos / clientes
- [x] PWA instalable
- [ ] Escaneo de QR de orden (cámara nativa)
- [ ] Integración SAT (CFDI para facturación)
- [ ] App nativa React Native (compartir capa de datos)
- [ ] Módulo de mantenimiento de máquinas (TPM)
- [ ] Integración con balanzas / PLC vía OPC-UA

## Licencia

Propiedad de Mallatex / Eduardo Gamboa. Uso bajo acuerdo comercial.
