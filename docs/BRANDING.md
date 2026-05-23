# Guía de marca · Mallatex Production Suite

Esta guía recoge los lineamientos visuales aplicados en la suite, tomando como
referencia la identidad de **Mallatex** (https://mallatex.com.mx) — empresa
mexicana especializada en agrotextiles para **agricultura protegida**.

> ⚠️ Esta suite incluye un logotipo SVG **placeholder** que respeta la paleta
> corporativa. Cuando recibas los archivos oficiales de Mallatex, colócalos en
> `public/brand/` y reemplaza `src/components/Logo.tsx` con la versión final.

## Paleta de color

La paleta combina **verdes vegetales** (cultivo, hojas), **tonos tierra** (suelo,
fibra natural), un **acento solar** (cosecha, atención) y un **azul cielo**
(invernadero, hidratación).

### Verde Mallatex (primario)

| Token | Hex | Uso |
|---|---|---|
| `mallatex-green-50`  | `#F1F8F2` | Fondos muy suaves, hover |
| `mallatex-green-100` | `#E8F5E9` | Tarjetas, badges suaves |
| `mallatex-green-500` | `#4CAF50` | Iconos, estados de éxito |
| `mallatex-green-700` | `#2D7A3E` | **Color primario** · CTA · header móvil PWA |
| `mallatex-green-800` | `#1F5E2E` | Hover de botones, panel login |
| `mallatex-green-900` | `#143F1E` | Sombras de verde, texto sobre claros |

### Tierra (secundario)

| Token | Hex | Uso |
|---|---|---|
| `mallatex-earth-500` | `#8D6E63` | Madera, materia prima |
| `mallatex-earth-700` | `#5D4037` | Texto sobre claros |

### Acentos

| Token | Hex | Uso |
|---|---|---|
| `mallatex-sun-500`  | `#FFA726` | Acento cosecha, alertas, prioridad media |
| `mallatex-sky-500`  | `#29B6F6` | Información, enlaces secundarios |

### Neutros (soil)

| Token | Hex | Uso |
|---|---|---|
| `mallatex-soil-50`  | `#FAFAFA` | Fondo de página |
| `mallatex-soil-100` | `#F4F4F5` | Hovers, divisores |
| `mallatex-soil-200` | `#E4E4E7` | Bordes |
| `mallatex-soil-500` | `#71717A` | Texto secundario |
| `mallatex-soil-700` | `#3F3F46` | Texto en botones ghost |
| `mallatex-soil-900` | `#1B1B1B` | **Texto principal** |

## Tipografía

- **Fuente principal**: `Inter` (sans-serif).  
  Fallback: `system-ui, Segoe UI, Roboto, sans-serif`.
- **Escala** (Tailwind):
  - `text-xs` (12px) — metadatos
  - `text-sm` (14px) — cuerpo
  - `text-base` (16px) — cuerpo móvil (evita zoom en iOS)
  - `text-2xl` / `text-3xl` — títulos de página

## Iconografía

- Librería: **lucide-react** (estilo línea, 1.5px, redondeado).
- Tamaño base: 20×20 px (`h-5 w-5`).
- Tono: usa `text-mallatex-soil-500` para inactivos y
  `text-mallatex-green-700` para activos.

## Logotipo

El logotipo provisional combina:

1. Un cuadrado redondeado con la **paleta verde** corporativa.
2. Una **textura de malla** sutil que evoca el producto (raschel/tejido).
3. Una **hoja anaranjada** que representa el cultivo bajo agricultura protegida.

Variantes:
- `<Logo variant="full" />` — símbolo + wordmark "Mallatex / Production Suite"
- `<Logo variant="mark" />` — solo símbolo (móvil, favicon)
- `<Logo inverse />` — versión sobre fondo verde (login, splash)

## Lenguaje visual

- **Bordes redondeados** generosos (`rounded-lg` / `rounded-xl`) — sensación
  orgánica, agrícola.
- **Sombras suaves** con tinte verde (ver `boxShadow.card` y
  `boxShadow.elevated` en `tailwind.config.ts`).
- **Patrones de malla** sutiles en pantallas de marca (ver pantalla de login).
- **Mobile-first**: tipografía 16px en inputs para evitar zoom en iOS,
  `env(safe-area-inset-*)` para notches y gestos.

## Aplicación responsive

- **Desktop ≥ 768px**: sidebar fijo izquierdo de 256px + header sticky.
- **Móvil < 768px**: header simplificado + **bottom navigation** con 5 ítems
  clave (Dashboard, Pedidos, Producción, Inventario, Reportes).
- **PWA**: la app es instalable; el shortcut "Registrar producción" se ofrece
  desde el manifest para acceso rápido en planta.

## Branding desde mallatex.com.mx

Cuando se disponga de los archivos oficiales, sustituir:

```
public/brand/
├── logo.svg             ← logotipo horizontal oficial
├── logo-inverse.svg     ← versión sobre verde
├── icon.svg             ← símbolo aislado
├── icon-192.png         ← PWA Android
├── icon-512.png         ← PWA splash
├── favicon.ico
└── og-image.png         ← 1200×630 para compartir en redes
```

Y en `tailwind.config.ts` ajustar los hex exactos cuando se confirmen con la
guía de marca formal de Mallatex.
